import { Entry, Github, Mirrors, Store, Sync } from 'frog'
import type { Octokit } from 'octokit'
import * as config from '../internal/config.js'
import * as mirrors from '../internal/mirrors.js'
import * as serialization from '../internal/serialize.js'
import * as summary from '../internal/summary.js'
import * as Repository from '../Repository.js'

/** What reconciling an issue event did. */
export type Outcome = {
  /** Sha of the reconciling commit, or `undefined` when nothing needed changing. */
  committed?: string | undefined
  /** Why nothing was done, when nothing was. */
  ignored?: string | undefined
  /** Repository holding the mirroring files, after repository-owned provenance is verified. */
  origin?: string | undefined
  /** The plan that was applied. */
  plan?: Sync.Plan | undefined
  /** Pull request carrying the reconciliation, when `pullRequest` is on. */
  pullRequest?: number | undefined
}

/**
 * Reconciles the files mirroring an issue after it changes.
 *
 * The marker only names a candidate repository. A committed entry or recovery record there must prove
 * that repository already mirrors this exact issue, and paths always come from that repository-owned
 * state. Editable issue text therefore cannot authorize arbitrary writes.
 *
 * Decisions come from `Sync.plan` unchanged, so the App and the CLI agree on what a closed or reopened
 * issue means.
 *
 * @returns What happened, or why nothing did.
 */
export async function issues(options: issues.Options): Promise<Outcome> {
  const { client, installation, issue, repo, serialize = serialization.direct } = options

  // A marker is only a routing hint. Committed state below decides whether the issue is ours to act on.
  const marker = Github.parseMarker(issue.body)
  if (!marker?.path) return { ignored: 'no Frog marker' }

  const origin = marker.origin ?? repo
  const source = origin === repo ? client : await installation(origin)
  if (!source) return { ignored: `Frog is not installed on \`${origin}\``, origin }

  return serialize(origin, async () => {
    const branch = await Github.defaultBranch(source.rest, { repo: origin })
    if (!branch) return { ignored: `cannot read \`${origin}\``, origin }

    const settings = await config.read(source, { repo: origin })
    const review = settings.pullRequest.enabled

    // Plan against the reconciling branch, where pending state lives. An issue that closes and then
    // reopens before the review merges has to reverse the deletion already queued there.
    //
    // With no review open the branch is the leftover of a merge. Reset it first: a squash leaves it on
    // a history the base no longer descends from, and that stale tree would decide the diff.
    const queued = review
      ? await Repository.review(source, {
          base: branch,
          branch: settings.pullRequest.branch,
          repo: origin,
        })
      : undefined
    if (review && !queued)
      await Repository.reset(source, {
        base: branch,
        branch: settings.pullRequest.branch,
        repo: origin,
      })

    const ref = queued ? settings.pullRequest.branch : branch
    const { entries } = await Repository.read(source, { ref, repo: origin })
    const remembered = await mirrors.read(source, { ref, repo: origin })

    const bindings: Mirrors.Mirror[] = remembered.mirrors.filter(
      (binding) => Github.parseLink(binding.issue)?.repo === repo,
    )
    for (const entry of entries) {
      if (!entry.issue) continue
      const link = Github.parseLink(entry.issue)
      if (link?.repo === repo) bindings.push({ issue: entry.issue, path: Store.toPath(entry.id) })
    }

    const current = Github.toLink({ issue: issue.number, repo })
    if (!bindings.some((binding) => binding.issue === current))
      return { ignored: 'untrusted Frog marker', origin }

    // Runs inside the origin lease and refetches current issue state. The delivered snapshot only
    // routes us here, so an older close cannot overwrite a newer reopen.
    const target = await config.read(client, { repo })
    const label = target.inbound.labels?.[0] ?? settings.labels[0] ?? 'friction'

    const state = await Sync.state({
      entries,
      get: (number) => Github.get(client.rest, { issue: number, repo }),
      list: () => Github.list(client.rest, { label, repo }),
      remembered: bindings
        .map((binding) => Github.parseLink(binding.issue)?.issue)
        .filter((number): number is number => number !== undefined),
      repo,
    })

    const trusted = new Set(
      bindings
        .map((binding) => Github.parseLink(binding.issue)?.issue)
        .filter((number): number is number => number !== undefined),
    )
    const plan = Sync.plan({
      entries,
      issues: state.filter((candidate) => trusted.has(candidate.number)),
      labels: settings.labels,
      mirrors: bindings,
      // The files are in `origin`; issues are in `repo`. They differ when reporting upstream.
      origin,
      repo,
    })

    const byId = new Map(entries.map((entry) => [entry.id, entry]))
    const remember: Mirrors.Mirror[] = []
    for (const id of plan.remove) {
      const entry = byId.get(id)
      if (entry?.issue) remember.push({ issue: entry.issue, path: Store.toPath(entry.id) })
    }

    const found = new Set(state.map((candidate) => candidate.number))
    const forget = [
      ...remembered.mirrors.filter((binding) => {
        const link = Github.parseLink(binding.issue)
        return link?.repo === repo && !found.has(link.issue)
      }),
      ...plan.write
        .filter((entry): entry is typeof entry & { issue: string } => Boolean(entry.issue))
        .map((entry) => ({ issue: entry.issue, path: Store.toPath(entry.id) })),
    ]
    const nextMirrors = Mirrors.update(remembered, { forget, remember })
    const mirrorsChanged = Mirrors.serialize(nextMirrors) !== Mirrors.serialize(remembered)

    if (Sync.empty(plan) && !mirrorsChanged) return { origin, plan }

    const committed = await Repository.commit(source, {
      branch: review ? settings.pullRequest.branch : branch,
      deletes: mirrorsChanged && nextMirrors.mirrors.length === 0 ? [Mirrors.file] : [],
      directories: plan.remove.map(Store.toDir),
      message: settings.commit.sync,
      repo: origin,
      ...(review ? { base: branch } : {}),
      writes: [
        ...[...plan.write, ...plan.clearLink].map((entry) => ({
          contents: Entry.serialize(entry),
          path: Store.toPath(entry.id),
        })),
        ...(mirrorsChanged && nextMirrors.mirrors.length > 0
          ? [{ contents: Mirrors.serialize(nextMirrors), path: Mirrors.file }]
          : []),
      ],
    })

    const pullRequest =
      review && committed
        ? await Repository.upsert(source, {
            base: branch,
            body: await summary.describe(source, {
              base: branch,
              branch: settings.pullRequest.branch,
              repo: origin,
            }),
            branch: settings.pullRequest.branch,
            repo: origin,
            title: 'chore: sync friction log',
          })
        : undefined

    return {
      origin,
      plan,
      ...(committed ? { committed } : {}),
      ...(pullRequest ? { pullRequest } : {}),
    }
  })
}

export declare namespace issues {
  /** Options for {@link issues}. */
  type Options = {
    /** Installation client for the repository the issue is in. */
    client: Octokit
    /**
     * Resolves an installation client for another repository.
     *
     * The files may live elsewhere, and the App cannot reconcile them without an installation there.
     */
    installation: (repo: string) => Promise<Octokit | undefined>
    /** The issue that changed, from the event payload. */
    issue: Github.Issue
    /** Repository the issue is in, as `owner/name`. */
    repo: string
    /** Serializes conflicting writes by repository. */
    serialize?: serialization.Serialize | undefined
  }
}
