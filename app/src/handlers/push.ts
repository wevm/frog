import { Entry, Store } from 'frog'
import type { Octokit } from 'octokit'
import type * as comment from '../internal/comment.js'
import * as config from '../internal/config.js'
import * as filing from '../internal/file.js'
import * as serialization from '../internal/serialize.js'
import * as summary from '../internal/summary.js'
import * as Repository from '../Repository.js'

/** What a push run did. */
export type Outcome = {
  /** Entries that landed on an issue already covering them. */
  commented: readonly comment.Link[]
  /** Sha of the commit writing the links back, or `undefined` when there was nothing to write. */
  committed?: string | undefined
  /** Entries filed as new issues. */
  created: readonly comment.Link[]
  /** Entries left pending, and why. */
  deferred: readonly { id: string; reason: string }[]
  /** Reconciling pull request the links went to, when the default branch is not written directly. */
  pullRequest?: number | undefined
}

/**
 * Files anything still pending once the work has landed, and writes the links back.
 *
 * This is where `issue:` gets written, rather than on the pull request branch: here the branch belongs
 * to the repository the App is installed on, so it is reachable, and a fork's contribution has already
 * been merged.
 *
 * It also closes the fork case. A fork's pull request had its issues filed but could not have its files
 * updated, so the link is written the moment the merge lands. Filing is idempotent, so the entries
 * already filed cost a lookup and nothing else.
 *
 * Self-terminating: the commit written here triggers another push, on which every entry already carries
 * a link, so nothing is pending and no commit is made. Under review that link is on the reconciling
 * branch rather than this one, which is why that branch is read too.
 *
 * @returns What happened.
 */
export async function push(options: push.Options): Promise<Outcome> {
  const { branch, client, installation, registry, repo, serialize = serialization.direct } = options

  const settings = await config.read(client, { ref: branch, repo })
  const review = settings.pullRequest.enabled
  const { entries } = await Repository.read(client, { ref: branch, repo })

  // Under review the link lands on the reconciling branch, not here, so this branch goes on showing the
  // entry as pending. Without reading that branch too, every later push would re-file and re-commit the
  // same links, and the write-back would never settle.
  const reviewed = review
    ? await Repository.read(client, { ref: settings.pullRequest.branch, repo }).catch(
        () => undefined,
      )
    : undefined
  const awaiting = new Set(
    (reviewed?.entries ?? []).filter((entry) => entry.issue).map((entry) => entry.id),
  )

  const { pending } = filing.partition(entries.filter((entry) => !awaiting.has(entry.id)))

  if (pending.length === 0) return { commented: [], created: [], deferred: [] }

  const filed = await filing.file({
    client,
    config: settings,
    entries: pending,
    installation,
    origin: repo,
    ...(options.actor ? { actor: options.actor } : {}),
    ...(registry ? { registry } : {}),
    serialize,
  })

  const initial = new Map(pending.map((entry) => [entry.id, Entry.serialize(entry)]))
  const committed = await serialize(repo, async () => {
    // Filing can take several requests. Re-read under the repository lease so a concurrent sync or
    // push cannot be overwritten with the stale snapshot from the start of this delivery.
    const current = await Repository.read(client, { ref: branch, repo })
    const writes: { contents: string; path: string }[] = []
    for (const entry of current.entries) {
      const issue = filed.links.get(entry.id)
      if (!issue || entry.issue || Entry.serialize(entry) !== initial.get(entry.id)) continue
      writes.push({
        contents: Entry.serialize({ ...entry, issue }),
        path: Store.toPath(entry.id),
      })
    }

    return Repository.commit(client, {
      branch: review ? settings.pullRequest.branch : branch,
      message: settings.commit.sync,
      repo,
      ...(review ? { base: branch } : {}),
      writes,
    })
  })

  // The same branch and pull request the issue handler reconciles through, so the links and the
  // closures land in one review rather than two. Without this the setting only half covers a protected
  // default branch: reconciliation would route around it and this write-back would still be refused.
  const pullRequest =
    review && committed
      ? await Repository.upsert(client, {
          base: branch,
          body: await summary.describe(client, {
            base: branch,
            branch: settings.pullRequest.branch,
            repo,
          }),
          branch: settings.pullRequest.branch,
          repo,
          title: 'chore: sync friction log',
        })
      : undefined

  return {
    commented: filed.commented,
    created: filed.created,
    deferred: filed.deferred,
    ...(committed ? { committed } : {}),
    ...(pullRequest ? { pullRequest } : {}),
  }
}

export declare namespace push {
  /** Options for {@link push}. */
  type Options = {
    /** GitHub login to credit in the footer, since the issue is authored by the App. */
    actor?: string | undefined
    /** Branch that was pushed. Only the default branch is handled. */
    branch: string
    /** Installation client for the repository. */
    client: Octokit
    /** Resolves an installation client for another repository. */
    installation: (repo: string) => Promise<Octokit | undefined>
    /** Registry base URL. Overridden in tests. */
    registry?: string | undefined
    /** Repository pushed to, as `owner/name`. */
    repo: string
    /** Serializes conflicting writes by repository. */
    serialize?: serialization.Serialize | undefined
  }
}
