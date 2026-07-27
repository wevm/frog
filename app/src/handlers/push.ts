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
 * Writes `issue:` here rather than on the pull request branch. This branch belongs to the repository
 * the App is installed on, so it is reachable.
 *
 * A fork's pull request had its issues filed but could not have its files updated, so the link is
 * written the moment the merge lands. Filing is idempotent, so an entry already filed costs a lookup
 * and nothing else.
 *
 * The commit written here triggers another push, on which every entry already carries a link and
 * nothing is pending. Under review that link lands on the reconciling branch, which is why that branch
 * is read too.
 *
 * @returns What happened.
 */
export async function push(options: push.Options): Promise<Outcome> {
  const { branch, client, installation, registry, repo, serialize = serialization.direct } = options

  const settings = await config.read(client, { ref: branch, repo })
  const review = settings.pullRequest.enabled
  const { entries } = await Repository.read(client, { ref: branch, repo })

  // Under review the link lands on the reconciling branch, so this branch goes on showing the entry as
  // pending. Reading that branch too stops every later push from re-filing the same links.
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
    // Re-read under the repository lease so a concurrent sync or push is not overwritten with the
    // snapshot this delivery started from. Filing can take several requests.
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

  // Reuses the branch and pull request the issue handler reconciles through, so the links and the
  // closures land in one review rather than two. A protected default branch would otherwise refuse this
  // write-back while reconciliation routed around it.
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
