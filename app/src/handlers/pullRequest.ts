import type { Entry } from 'frog'
import type { Octokit } from 'octokit'
import * as comment from '../internal/comment.js'
import * as config from '../internal/config.js'
import * as filing from '../internal/file.js'
import * as serialization from '../internal/serialize.js'
import * as Repository from '../Repository.js'

/**
 * Files the entries a pull request introduces, and reports back on the pull request.
 *
 * Reads the head commit from the **base** repository, where GitHub makes a pull request's head commit
 * reachable. The installation needs no access to the fork.
 *
 * Repository contents are read-only to the App. The repository-owned reconciliation Action writes the
 * `issue:` link after the entry lands on the default branch.
 *
 * @returns What happened, already reported on the pull request.
 */
export async function pullRequest(options: pullRequest.Options): Promise<comment.Report> {
  const {
    base,
    baseRef,
    client,
    head,
    installation,
    pr,
    registry,
    serialize = serialization.direct,
  } = options

  const settings = await config.read(client, { ref: baseRef, repo: base })
  const contents = await Repository.read(client, { ref: head, repo: base })

  // Only what this pull request changed. Reading the head alone would report every entry the base
  // branch already carries, and file the unpublished ones against whoever opened an unrelated pull
  // request.
  const before = await Repository.read(client, { ref: baseRef, repo: base })
  const changed = introduced(contents.entries, before.entries)

  const malformed = contents.malformed
  const { linked, pending } = filing.partition(changed)

  const filed = await filing.file({
    app: options.app,
    client,
    config: settings,
    entries: pending,
    installation,
    origin: base,
    pr: `${base}#${pr}`,
    ...(options.actor ? { actor: options.actor } : {}),
    ...(registry ? { registry } : {}),
    serialize,
  })

  const report: comment.Report = {
    commented: filed.commented,
    created: filed.created,
    deferred: filed.deferred,
    linked,
    malformed,
  }

  const body = comment.render(report)
  if (body) {
    const comments = await options.comments()
    await serialize(base, () =>
      comment.upsert(comments, { author: options.app, body, pr, repo: base }),
    )
  }

  return report
}

/** Entries a pull request adds or edits, by comparing its head against the branch it targets. */
function introduced(
  head: readonly Entry.Entry[],
  base: readonly Entry.Entry[],
): readonly Entry.Entry[] {
  const existing = new Map(base.map((entry) => [entry.id, entry]))
  return head.filter((entry) => {
    const previous = existing.get(entry.id)
    return (
      !previous ||
      previous.body !== entry.body ||
      previous.severity !== entry.severity ||
      previous.title !== entry.title
    )
  })
}

export declare namespace pullRequest {
  /** Options for {@link pullRequest}. */
  type Options = {
    /** Authenticated GitHub App bot login. */
    app: string
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
    /** Lazily resolves a repository-scoped client for pull-request comments. */
    comments: () => Promise<Octokit>
    /** Head commit sha, reachable from the base repository even for a fork. */
    head: string
    /**
     * Resolves an installation client for another repository.
     *
     * Returns `undefined` when Frog is not installed there, gating cross-repo filing on the receiver's
     * installation.
     */
    installation: (repo: string) => Promise<Octokit | undefined>
    /** Pull request number. */
    pr: number
    /** Registry base URL. Overridden in tests. */
    registry?: string | undefined
    /** Serializes conflicting writes by repository. */
    serialize?: serialization.Serialize | undefined
  }
}
