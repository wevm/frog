import { Github, Store } from 'frog'
import type { Octokit } from 'octokit'
import * as mirrors from '../internal/mirrors.js'
import * as serialization from '../internal/serialize.js'
import * as signal from '../internal/signal.js'
import * as Repository from '../Repository.js'

/** What handling a linked issue event did. */
export type Outcome = {
  /** Why nothing was done, when nothing was. */
  ignored?: string | undefined
  /** Repository whose workflow was woken, after repository-owned provenance was verified. */
  origin?: string | undefined
  /** App-owned coordination resources used to wake the workflow. */
  signal?: signal.wake.Result | undefined
}

/**
 * Wakes the source repository after one of its linked issues closes or reopens.
 *
 * Editable issue text only routes the lookup. A committed entry or recovery record in the source
 * repository must bind the exact issue and path before Frog creates any wakeup signal.
 */
export async function issues(options: issues.Options): Promise<Outcome> {
  const {
    app,
    client,
    delivery,
    installation,
    issue,
    repo,
    serialize = serialization.direct,
  } = options

  if (issue.author !== app) return { ignored: 'issue is not owned by Frog' }

  const marker = Github.parseMarker(issue.body)
  if (!marker?.path) return { ignored: 'no Frog marker' }

  const origin = marker.origin ?? repo
  const source = origin === repo ? client : await installation(origin)
  if (!source) return { ignored: `Frog is not installed on \`${origin}\``, origin }

  return serialize(origin, async () => {
    const branch = await Github.defaultBranch(source.rest, { repo: origin })
    if (!branch) return { ignored: `cannot read \`${origin}\``, origin }

    const [{ entries }, remembered] = await Promise.all([
      Repository.read(source, { ref: branch, repo: origin }),
      mirrors.read(source, { ref: branch, repo: origin }),
    ])
    const link = Github.toLink({ issue: issue.number, repo })
    const bound =
      entries.some((entry) => entry.issue === link && Store.toPath(entry.id) === marker.path) ||
      remembered.mirrors.some((mirror) => mirror.issue === link && mirror.path === marker.path)
    if (!bound) return { ignored: 'untrusted Frog marker', origin }

    return {
      origin,
      signal: await signal.wake(source, { author: app, delivery, repo: origin }),
    }
  })
}

export declare namespace issues {
  /** Options for {@link issues}. */
  type Options = {
    /** Authenticated GitHub App bot login. */
    app: string
    /** Installation client for the repository the issue is in. */
    client: Octokit
    /** Verified GitHub webhook delivery id. */
    delivery: string
    /**
     * Resolves an installation client for another repository.
     *
     * The source repository may differ when friction was reported upstream.
     */
    installation: (repo: string) => Promise<Octokit | undefined>
    /** The issue that changed, from the event payload. */
    issue: Github.Issue
    /** Repository the issue is in, as `owner/name`. */
    repo: string
    /** Serializes conflicting wakeups by source repository. */
    serialize?: serialization.Serialize | undefined
  }
}
