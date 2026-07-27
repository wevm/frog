import { Entry, Store } from 'frog'
import type { Octokit } from 'octokit'
import * as comment from '../internal/comment.js'
import * as config from '../internal/config.js'
import * as filing from '../internal/file.js'
import * as serialization from '../internal/serialize.js'
import * as Repository from '../Repository.js'

/**
 * Files the entries a pull request introduces, and reports back on the pull request.
 *
 * Reads the head commit from the **base** repository rather than the head one. GitHub makes a pull
 * request's head commit reachable there, so this works for a fork without the installation needing any
 * access to that fork.
 *
 * The `issue:` link is written straight onto the pull request's own branch, so the entry lands already
 * filed and the merge needs no follow-up commit. That costs one extra `synchronize` delivery, on which
 * the entry is already linked and so is neither re-filed nor re-reported.
 *
 * A fork's branch belongs to a repository the App has no installation on, so there the link still waits
 * for the push handler to write it once the work has landed.
 *
 * @returns What happened, already reported on the pull request.
 */
export async function pullRequest(options: pullRequest.Options): Promise<comment.Report> {
  const {
    base,
    baseRef,
    client,
    head,
    headRef,
    headRepo,
    installation,
    pr,
    registry,
    serialize = serialization.direct,
  } = options

  const settings = await config.read(client, { ref: baseRef, repo: base })
  const contents = await Repository.read(client, { ref: head, repo: base })

  // Only what this pull request actually changed. Reading the head alone would report every entry the
  // base branch already carries, and file issues for any of them still unpublished, crediting them to
  // whoever happened to open an unrelated pull request.
  const before = await Repository.read(client, { ref: baseRef, repo: base })
  const changed = introduced(contents.entries, before.entries)

  const malformed = contents.malformed
  const { linked, pending } = filing.partition(changed)

  const initial = new Map(pending.map((entry) => [entry.id, Entry.serialize(entry)]))

  const filed = await filing.file({
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

  // Best effort. The issue is already filed, so a branch this App cannot write to, whether protected by
  // a ruleset or simply gone, must not fail the delivery and lose the report on the pull request. The
  // push handler writes the link when the work lands, which is the same path a fork takes.
  if (headRepo === base && filed.links.size > 0)
    await serialize(base, async () => {
      // Filing takes several requests. Re-read under the lease so a concurrent push is not overwritten
      // with the snapshot this delivery started from.
      const current = await Repository.read(client, { ref: headRef, repo: base })
      const writes = current.entries.flatMap((entry) => {
        const issue = filed.links.get(entry.id)
        // An entry edited while it was being filed describes something other than the issue that was
        // opened for it. Leaving it unlinked lets the next delivery report the edit.
        if (!issue || entry.issue || Entry.serialize(entry) !== initial.get(entry.id)) return []
        return [{ contents: Entry.serialize({ ...entry, issue }), path: Store.toPath(entry.id) }]
      })

      return Repository.commit(client, {
        branch: headRef,
        message: settings.commit.link,
        repo: base,
        writes,
      })
    }).catch(() => undefined)

  const report: comment.Report = {
    commented: filed.commented,
    created: filed.created,
    deferred: filed.deferred,
    linked,
    malformed,
  }

  const body = comment.render(report)
  if (body) await serialize(base, () => comment.upsert(client, { body, pr, repo: base }))

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
    return !previous || previous.body !== entry.body || previous.title !== entry.title
  })
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
    /** Head branch, written to when it belongs to the base repository. */
    headRef: string
    /** Repository the head branch lives on, or `null` when a deleted fork owned it. */
    headRepo: string | null
    /**
     * Resolves an installation client for another repository.
     *
     * Returns `undefined` when frog is not installed there, which is what makes the receiver's
     * installation the consent gate for cross-repo filing.
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
