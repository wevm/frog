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
 * Nothing is written back to the pull request branch, deliberately. A commit there would trigger
 * `synchronize` and run this again, and a fork's branch is unreachable to the App anyway. The `issue:`
 * link is written when the work lands, by the push handler.
 *
 * @returns What happened, already reported on the pull request.
 */
export async function pullRequest(options: pullRequest.Options): Promise<comment.Report> {
  const {
    base,
    baseRef,
    client,
    delivery,
    head,
    installation,
    pr,
    registry,
    serialize = serialization.direct,
  } = options

  const settings = await config.read(client, { ref: baseRef, repo: base })
  const { entries, malformed } = await Repository.read(client, { ref: head, repo: base })
  const { linked, pending } = filing.partition(entries)

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
    /** GitHub delivery id used to make issue publishing replay-safe. */
    delivery?: string | undefined
    /** Head commit sha, reachable from the base repository even for a fork. */
    head: string
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
