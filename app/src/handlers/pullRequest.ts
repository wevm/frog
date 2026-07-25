import { Config, type Frictionset, Github, Store, Target } from 'frictionsets'
import type { Octokit } from 'octokit'
import * as comment from '../internal/comment.js'
import * as resolvers from '../internal/resolvers.js'
import * as Repository from '../Repository.js'

/**
 * Files the frictionsets a pull request introduces, and reports back on the pull request.
 *
 * Reads the head commit from the **base** repository rather than the head one. GitHub makes a pull
 * request's head commit reachable from the base repo, so this works for a fork without the installation
 * needing any access to that fork.
 *
 * Nothing is written back to the pull request branch, deliberately. It would create a commit, which
 * triggers `synchronize`, which runs this again; and a fork's branch is unreachable to the App anyway.
 * The `issue:` link is written when the work lands, by the push handler.
 *
 * @returns What happened, already reported on the pull request.
 */
export async function pullRequest(options: pullRequest.Options): Promise<comment.Report> {
  const { base, baseRef, client, head, installation, pr, registry } = options

  // Config always from the base branch. A pull request must not get to say where its issues go, or who
  // may receive them.
  const config = await (async () => {
    const contents = await Github.fetchFile(client.rest, {
      path: Config.file,
      ref: baseRef,
      repo: base,
    })
    try {
      return contents ? Config.from(JSON.parse(contents)) : Config.from({})
    } catch {
      return Config.from({})
    }
  })()

  const { entries, malformed } = await Repository.read(client, { ref: head, repo: base })

  const linked: comment.Link[] = []
  const pending: Frictionset.Frictionset[] = []
  for (const entry of entries) {
    if (entry.issue) linked.push({ id: entry.id, issue: entry.issue })
    else pending.push(entry)
  }

  const deferred: { id: string; reason: string }[] = []
  const capped = pending.slice(0, config.maxPerRun)
  for (const entry of pending.slice(config.maxPerRun))
    deferred.push({ id: entry.id, reason: `over the ceiling of ${config.maxPerRun} per run` })

  const stack = resolvers.resolvers({
    allowedRepos: config.outbound.allowedRepos,
    client,
    self: base,
    ...(registry ? { registry } : {}),
  })

  /** Entries grouped by destination, so one destination costs one dedupe preparation. */
  const groups = new Map<
    string,
    { entries: Frictionset.Frictionset[]; labels?: readonly string[] }
  >()

  for (const entry of capped) {
    const resolution = await Target.resolve(entry.target, stack)
    if (!resolution.ok) {
      deferred.push({ id: entry.id, reason: resolution.message })
      continue
    }

    const { labels, repo: destination } = resolution.target

    // Filing upstream unattended is opt-in per sender. An entry written in a private repository can
    // carry detail that should not become a public issue without somebody reading it first.
    if (destination !== base && !config.outbound.auto) {
      deferred.push({
        id: entry.id,
        reason: `\`${destination}\` is upstream, and \`outbound.auto\` is off. Run \`frictionsets publish\`.`,
      })
      continue
    }

    const group = groups.get(destination) ?? { entries: [], ...(labels ? { labels } : {}) }
    group.entries.push(entry)
    groups.set(destination, group)
  }

  const commented: comment.Link[] = []
  const created: comment.Link[] = []

  for (const [destination, group] of groups) {
    // Cross-repo needs its own installation token. Without an installation there is no token, so the
    // App cannot file there at all: consent enforced by GitHub rather than by us.
    const target = destination === base ? client : await installation(destination)
    if (!target) {
      for (const entry of group.entries)
        deferred.push({
          id: entry.id,
          reason: `frictionsets is not installed on \`${destination}\`.`,
        })
      continue
    }

    const applied = group.labels?.length ? group.labels : config.labels
    const matcher = await Github.matcher(target.rest, {
      label: applied[0] ?? 'friction',
      repo: destination,
    })

    for (const entry of group.entries) {
      const existing = await matcher.match(entry.title)
      const result = await Github.publish(target.rest, {
        frictionset: entry,
        labels: Github.toLabels({
          frictionset: entry,
          labels: applied,
          severityLabels: config.severityLabels,
        }),
        marker: { hash: Github.hash(entry.title), origin: base, path: Store.toPath(entry.id) },
        provenance: { pr: `${base}#${pr}`, ...(options.actor ? { author: options.actor } : {}) },
        repo: destination,
        ...(existing ? { existing } : {}),
      })

      const link = {
        id: entry.id,
        issue: Github.toLink({ issue: result.issue, repo: destination }),
      }
      ;(result.status === 'commented' ? commented : created).push(link)
    }
  }

  const report: comment.Report = { commented, created, deferred, linked, malformed }

  const body = comment.render(report)
  if (body) await comment.upsert(client, { body, pr, repo: base })

  return report
}

export declare namespace pullRequest {
  /** Options for {@link pullRequest}. */
  type Options = {
    /**
     * GitHub login of whoever opened the pull request.
     *
     * The issue is authored by the App, so this footer line is the only trace of who hit the friction.
     */
    actor?: string | undefined
    /** Base repository, as `owner/name`. */
    base: string
    /** Base branch, which config is always read from. */
    baseRef: string
    /** Installation client for the base repository. */
    client: Octokit
    /** Head commit sha, reachable from the base repository even for a fork. */
    head: string
    /**
     * Resolves an installation client for another repository.
     *
     * Returns `undefined` when frictionsets is not installed there, which is what makes the receiver's
     * installation the consent gate for cross-repo filing.
     */
    installation: (repo: string) => Promise<Octokit | undefined>
    /** Pull request number. */
    pr: number
    /** Registry base URL. Overridden in tests. */
    registry?: string | undefined
  }
}
