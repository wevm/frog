import type * as Config from '../../Config.js'
import type * as Entry from '../../Entry.js'
import * as Git from '../../Git.js'
import * as Github from '../../Github.js'
import * as Store from '../../Store.js'
import * as octokit from './octokit.js'

export type Link = { id: string; issue: string }

export type Outcome = {
  /** Entries that landed on an issue already covering them. */
  commented: Link[]
  created: Link[]
  /**
   * Destinations whose labels were dropped, because the token cannot label there.
   *
   * Surfaced so a receiver's `inbound.labels` silently not applying is visible.
   */
  unlabelled: string[]
  /**
   * Paths written, for the caller to stage.
   *
   * Filing may span several destinations, and those belong in one commit.
   */
  written: string[]
}

export type Ready = {
  client: Github.Client
  /** Label used to find issues frog already filed. */
  label: string
  repo: string
}

export type Blocked = { code: string; message: string; retryable?: boolean | undefined }

/**
 * Resolves everything filing needs, or reports what is missing.
 *
 * Shared by `publish` and `log --publish` so the two cannot drift on which token wins or which label
 * dedupe keys off.
 */
export async function prepare(options: prepare.Options): Promise<Blocked | Ready> {
  const { config, env, repo, token } = options

  if (!repo)
    return {
      code: 'NO_REPO',
      message:
        'Could not determine the target repository. Add a GitHub `origin` remote, or set `repo` in the config file.',
    }

  const label = config.labels[0]
  if (!label)
    return {
      code: 'NO_LABEL',
      message: '`labels` must not be empty: it is how already-filed issues are found.',
    }

  const resolved = await octokit.token({ env, ...(token ? { token } : {}) })
  if (!resolved)
    return {
      code: 'NOT_AUTHENTICATED',
      message: 'No GitHub token found.',
      retryable: true,
    }

  return {
    client: octokit.client({
      token: resolved,
      ...(env.GITHUB_API_URL ? { baseUrl: env.GITHUB_API_URL } : {}),
    }),
    label,
    repo,
  }
}

/**
 * Turns an API failure into something a reader can act on.
 *
 * Octokit's own message for a missing repository is `Not Found - <docs url>`, which says nothing
 * about which repository or what to do about it.
 */
export function toFailure(failure: toFailure.Options): Blocked {
  const { message, repo, status } = failure

  if (status === 404)
    return {
      code: 'REPO_NOT_FOUND',
      message: `Cannot see \`${repo}\`. Either it does not exist, or the token cannot access it.`,
    }

  if (status === 401 || status === 403)
    return {
      code: 'NOT_AUTHORIZED',
      message: `The token was rejected for \`${repo}\`. It needs write access to issues.`,
      retryable: true,
    }

  return { code: 'PUBLISH_FAILED', message, retryable: true }
}

export declare namespace toFailure {
  type Options = {
    message: string
    repo: string
    status?: number | undefined
  }
}

export declare namespace prepare {
  type Options = {
    config: Config.Config
    env: {
      GH_TOKEN?: string | undefined
      GITHUB_API_URL?: string | undefined
      GITHUB_TOKEN?: string | undefined
    }
    repo: string | undefined
    token?: string | undefined
  }
}

/**
 * Files entries as issues and writes the `issue:` link back into each file.
 *
 * Existing issues are indexed once for the whole run rather than looked up per entry, and an entry
 * whose hash is already indexed gets a comment instead of a duplicate. That is what makes this safe
 * to run repeatedly over the same entries.
 *
 * A failure part-way through throws, leaving already-filed entries with their links on disk and the
 * rest pending. Nothing is lost, and re-running picks up where it stopped.
 */
export async function file(options: file.Options): Promise<Outcome> {
  const { client, config, dryRun, entries, label, origin, pr, repo, root } = options

  // A cross-repo target may name its own labels, in which case dedupe must index by one of those and
  // not by the sender's.
  const applied = options.labels?.length ? options.labels : config.labels

  const matcher = await Github.matcher(client, { label: applied[0] ?? label, repo })
  const [author, sha] = await Promise.all([Git.author({ cwd: root }), Git.head({ cwd: root })])

  const commented: Link[] = []
  const created: Link[] = []
  const written: string[] = []
  /** Filed during this run, so two entries with one title collapse onto one issue. */
  const seen = new Map<string, Github.Issue>()

  for (const entry of entries) {
    const hash = Github.hash(entry.title)
    const existing = seen.get(hash) ?? (await matcher.match(entry.title))
    const path = Store.toPath(entry.id)

    if (dryRun) {
      const link = existing ? Github.toLink({ issue: existing.number, repo }) : '(new)'
      ;(existing ? commented : created).push({ id: entry.id, issue: link })
      continue
    }

    // An entry logged moments ago is not committed, so fall back to the local identity and HEAD.
    const provenance = (await Git.provenance(path, { cwd: root })) ?? {
      ...(author ? { author } : {}),
      ...(sha ? { sha } : {}),
    }

    const result = await Github.publish(client, {
      entry: entry,
      labels: Github.toLabels({
        entry: entry,
        labels: applied,
        severityLabels: config.severityLabels,
      }),
      // `origin` is the repository holding the file, which is not the destination when reporting
      // upstream. Getting this wrong would leave a closed issue unable to find its mirror.
      marker: { hash, origin, path },
      provenance: { ...provenance, ...(pr ? { pr } : {}) },
      repo,
      ...(existing ? { existing } : {}),
    })

    const issue = Github.toLink({ issue: result.issue, repo })
    await Store.write({ ...entry, issue }, { id: entry.id, root })
    written.push(path)
    ;(result.status === 'commented' ? commented : created).push({ id: entry.id, issue })

    if (!existing) seen.set(hash, { number: result.issue, state: 'open', title: entry.title })
  }

  return {
    commented,
    created,
    written,
    // Reported rather than swallowed: the receiver asked for these and did not get them.
    unlabelled: !matcher.labelled && applied.length > 0 && !dryRun ? [repo] : [],
  }
}

export declare namespace file {
  /** Options for {@link file}. */
  type Options = Ready & {
    /** Normalized sender config, for severity labels and the default label set. */
    config: Config.Config
    /** Report what would happen without filing anything. */
    dryRun?: boolean | undefined
    /** Entries to file. Every one must belong to `repo`. */
    entries: readonly Entry.Entry[]
    /** Labels to apply, overriding the sender's. Set when a target named its own. */
    labels?: readonly string[] | undefined
    /**
     * Repository holding the entries, as `owner/name`.
     *
     * Distinct from `repo`, which is where the issue is filed. They differ whenever friction is
     * reported upstream, and the marker records this one so a closed issue can find its mirror.
     */
    origin: string
    /** Pull request this is filed from, as `owner/name#number`. */
    pr?: string | undefined
    /** Repository root. */
    root: string
  }
}
