import { Entry, Store } from 'frog'
import type { Octokit } from 'octokit'
import type * as comment from '../internal/comment.js'
import * as config from '../internal/config.js'
import * as filing from '../internal/file.js'
import * as serialization from '../internal/serialize.js'
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
 * a link, so nothing is pending and no commit is made.
 *
 * @returns What happened.
 */
export async function push(options: push.Options): Promise<Outcome> {
  const {
    branch,
    client,
    delivery,
    installation,
    registry,
    repo,
    serialize = serialization.direct,
  } = options

  const settings = await config.read(client, { ref: branch, repo })
  const { entries } = await Repository.read(client, { ref: branch, repo })
  const { pending } = filing.partition(entries)

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
      branch,
      message: 'chore: link friction log to issues',
      repo,
      writes,
    })
  })

  return {
    commented: filed.commented,
    created: filed.created,
    deferred: filed.deferred,
    ...(committed ? { committed } : {}),
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
    /** GitHub delivery id used to make issue publishing replay-safe. */
    delivery?: string | undefined
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
