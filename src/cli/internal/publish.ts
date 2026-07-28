import type * as Config from '../../Config.js'
import type * as Entry from '../../Entry.js'
import * as Git from '../../Git.js'
import * as Github from '../../Github.js'
import * as Store from '../../Store.js'
import * as octokit from './octokit.js'

export type Link = { id: string; issue: string; title: string }

export type Outcome = {
  /** Entries that landed on an issue already covering them. */
  commented: Link[]
  /** Entries whose GitHub mutation succeeded or may have happened. */
  consumed: number
  created: Link[]
  /** Destinations whose labels were dropped because the token cannot label there. */
  unlabelled: string[]
  /** Paths written, for the caller to stage. */
  written: string[]
}

export type Ready = {
  client: Github.Client
  /** Label used to find issues Frog already filed. */
  label: string
  repo: string
}

export type Blocked = { code: string; message: string; retryable?: boolean | undefined }

/**
 * Resolves everything filing needs, or reports what is missing.
 *
 * Shared by `publish` and `log --publish` so the two cannot drift on which token takes precedence or
 * which label dedupe keys off.
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
      message: '`labels` must not be empty. Frog finds already-filed issues by the first one.',
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
 * Octokit's own message for a missing repository is `Not Found - <docs url>`, which names neither the
 * repository nor a fix.
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
 * Existing issues are indexed once for the whole run. An entry whose hash is already indexed gets a
 * comment instead of a duplicate, so this is safe to run repeatedly over the same entries.
 *
 * A failure part-way through throws {@link PartialError}, carrying the completed links and the entries
 * that were not filed. Re-running picks up where it stopped.
 */
export async function file(options: file.Options): Promise<Outcome> {
  const { client, config, dryRun, entries, expectedAuthor, label, origin, pr, repo, root } = options

  // A cross-repo target may name its own labels, in which case dedupe must index by one of those and
  // not by the sender's.
  const applied = options.labels?.length ? options.labels : config.labels

  const matcher = await Github.matcher(client, {
    ...(expectedAuthor ? { expectedAuthor } : {}),
    label: applied[0] ?? label,
    repo,
  })
  const [author, sha] = await Promise.all([Git.author({ cwd: root }), Git.head({ cwd: root })])

  const commented: Link[] = []
  let consumed = 0
  const created: Link[] = []
  const written: string[] = []
  /** Filed during this run, so two entries with one title collapse onto one issue. */
  const seen = new Map<string, Github.Issue>()
  const outcome = (): Outcome => ({
    commented,
    consumed,
    created,
    written,
    unlabelled:
      !matcher.labelled && applied.length > 0 && !dryRun && commented.length + created.length > 0
        ? [repo]
        : [],
  })

  for (const [index, entry] of entries.entries()) {
    let reserved = false
    try {
      const hash = Github.hash(entry.title)
      const report = Github.report({ entry, origin })
      const occurrence = Github.occurrence({ entry, origin })
      const revision = Github.revision({ entry, origin })
      const existing = seen.get(hash) ?? (await matcher.match(entry.title, { occurrence, report }))
      const path = Store.toPath(entry.id)

      if (dryRun) {
        const link = existing ? Github.toLink({ issue: existing.number, repo }) : '(new)'
        const status = existing
          ? await Github.findRevision(client, {
              existing,
              repo,
              revision,
              ...(expectedAuthor ? { expectedAuthor } : {}),
            })
          : undefined
        const location =
          status ??
          (existing
            ? await Github.findReport(client, {
                existing,
                report,
                repo,
                ...(expectedAuthor ? { expectedAuthor } : {}),
              })
            : undefined) ??
          (existing
            ? await Github.findOccurrence(client, {
                existing,
                occurrence,
                repo,
                ...(expectedAuthor ? { expectedAuthor } : {}),
              })
            : undefined)
        const category = location ?? (existing ? 'commented' : 'created')
        ;(category === 'commented' ? commented : created).push({
          id: entry.id,
          issue: link,
          title: entry.title,
        })
        if (!status) consumed += 1
        continue
      }

      // An entry logged moments ago is not committed, so fall back to the local identity and HEAD.
      const provenance = (await Git.provenance(path, { cwd: root })) ?? {
        ...(author ? { author } : {}),
        ...(sha ? { sha } : {}),
      }

      reserved = true
      const result = await Github.publish(client, {
        entry: entry,
        ...(expectedAuthor ? { expectedAuthor } : {}),
        labels: Github.toLabels({
          entry: entry,
          labels: applied,
        }),
        // `origin` is the repository holding the file, not the destination when reporting upstream. A
        // wrong value leaves a closed issue unable to find its mirror.
        marker: { hash, origin, path, severity: entry.severity },
        occurrence,
        provenance: { ...provenance, ...(pr ? { pr } : {}) },
        repo,
        report,
        revision,
        ...(existing ? { existing } : {}),
      })
      if (result.mutated) consumed += 1
      reserved = false

      const issue = Github.toLink({ issue: result.issue, repo })
      ;(result.status === 'commented' ? commented : created).push({
        id: entry.id,
        issue,
        title: entry.title,
      })
      await Store.write({ ...entry, issue }, { id: entry.id, root })
      written.push(path)

      if (!existing)
        seen.set(hash, {
          ...(expectedAuthor ? { author: expectedAuthor } : {}),
          number: result.issue,
          state: 'open',
          title: entry.title,
        })
    } catch (error) {
      // Once the request starts, a transport failure cannot prove GitHub did not apply it.
      if (reserved) consumed += 1
      throw new PartialError({
        cause: error,
        entries: entries.slice(index),
        outcome: outcome(),
      })
    }
  }

  return outcome()
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
    /** Issue author trusted for matching and replay markers. Every author is trusted when omitted. */
    expectedAuthor?: string | undefined
    /** Labels to apply, overriding the sender's. Set when a target named its own. */
    labels?: readonly string[] | undefined
    /**
     * Repository holding the entries, as `owner/name`.
     *
     * Distinct from `repo`, where the issue is filed. They differ whenever friction is reported
     * upstream.
     */
    origin: string
    /** Pull request this is filed from, as `owner/name#number`. */
    pr?: string | undefined
    /** Repository root. */
    root: string
  }
}

/** Filing failure carrying progress made before the failed entry. */
export class PartialError extends Error {
  /** Failed and unattempted entries, in their original order. */
  entries: readonly Entry.Entry[]
  /** Filing progress completed before the failure. */
  outcome: Outcome
  /** HTTP status supplied by Octokit, when present. */
  status?: number | undefined

  constructor(options: { cause: unknown; entries: readonly Entry.Entry[]; outcome: Outcome }) {
    const cause = options.cause instanceof Error ? options.cause : new Error(String(options.cause))
    super(cause.message, { cause })
    this.name = 'publisher.PartialError'
    this.entries = options.entries
    this.outcome = options.outcome
    const status = (cause as Error & { status?: number }).status
    if (typeof status === 'number') this.status = status
  }
}
