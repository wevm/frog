import type { Config, Entry } from 'frog'
import { Github, Store, Target } from 'frog'
import type { Octokit } from 'octokit'
import type * as comment from './comment.js'
import * as resolvers from './resolvers.js'

/** What filing a set of entries did. */
export type Filing = {
  /** Entries that landed on an issue already covering them. */
  commented: comment.Link[]
  /** Entries filed as new issues. */
  created: comment.Link[]
  /** Entries left pending, and why. */
  deferred: { id: string; reason: string }[]
  /** Issue link for each entry that got one, keyed by entry id. */
  links: Map<string, string>
}

/**
 * Resolves each entry's destination, applies every gate, and files what is allowed through.
 *
 * Shared by the pull request and push handlers, which differ only in what they do afterwards: one
 * comments, the other writes the links back. The gates themselves must not differ between them.
 */
export async function file(options: file.Options): Promise<Filing> {
  const { actor, client, config, entries, installation, origin, pr, registry } = options

  const stack = resolvers.resolvers({
    allowedRepos: config.outbound.allowedRepos,
    client,
    self: origin,
    ...(registry ? { registry } : {}),
  })

  const deferred: { id: string; reason: string }[] = []

  /** Grouped by destination, so one destination costs one dedupe preparation however many entries. */
  const groups = new Map<string, { entries: Entry.Entry[]; labels?: readonly string[] }>()

  for (const entry of entries) {
    const resolution = await Target.resolve(entry.target, stack)
    if (!resolution.ok) {
      deferred.push({ id: entry.id, reason: resolution.message })
      continue
    }

    const { labels, repo: destination } = resolution.target

    // Filing upstream unattended is opt-in per sender. An entry written in a private repository can
    // carry detail that should not become a public issue without somebody reading it first.
    if (destination !== origin && !config.outbound.auto) {
      deferred.push({
        id: entry.id,
        reason: `\`${destination}\` is upstream, and \`outbound.auto\` is off. Run \`frog publish\`.`,
      })
      continue
    }

    const group = groups.get(destination) ?? { entries: [], ...(labels ? { labels } : {}) }
    group.entries.push(entry)
    groups.set(destination, group)
  }

  const commented: comment.Link[] = []
  const created: comment.Link[] = []
  const links = new Map<string, string>()

  for (const [destination, group] of groups) {
    // Cross-repo needs its own installation token. Without an installation there is no token, so the
    // App cannot file there at all: consent enforced by GitHub rather than by us.
    const target = destination === origin ? client : await installation(destination)
    if (!target) {
      for (const entry of group.entries)
        deferred.push({
          id: entry.id,
          reason: `frog is not installed on \`${destination}\`.`,
        })
      continue
    }

    const applied = group.labels?.length ? group.labels : config.labels
    const matcher = await Github.matcher(target.rest, {
      label: applied[0] ?? 'friction',
      repo: destination,
    })
    /** Filed during this run, so two entries with one title collapse onto one issue. */
    const seen = new Map<string, Github.Issue>()

    for (const entry of group.entries) {
      const hash = Github.hash(entry.title)
      const existing = seen.get(hash) ?? (await matcher.match(entry.title))

      const result = await Github.publish(target.rest, {
        entry: entry,
        labels: Github.toLabels({
          entry: entry,
          labels: applied,
          severityLabels: config.severityLabels,
        }),
        // `origin` is where the file lives, which is not the destination when reporting upstream.
        marker: { hash, origin, path: Store.toPath(entry.id) },
        provenance: { ...(actor ? { author: actor } : {}), ...(pr ? { pr } : {}) },
        repo: destination,
        ...(existing ? { existing } : {}),
      })

      const issue = Github.toLink({ issue: result.issue, repo: destination })
      links.set(entry.id, issue)
      ;(result.status === 'commented' ? commented : created).push({ id: entry.id, issue })

      if (!existing) seen.set(hash, { number: result.issue, state: 'open', title: entry.title })
    }
  }

  return { commented, created, deferred, links }
}

export declare namespace file {
  /** Options for {@link file}. */
  type Options = {
    /** GitHub login to credit in the footer, since the issue is authored by the App. */
    actor?: string | undefined
    /** Installation client for the repository holding the entries. */
    client: Octokit
    /** Normalized config, read from the default branch. */
    config: Config.Config
    /** Entries to file. Already capped and already free of linked ones. */
    entries: readonly Entry.Entry[]
    /** Resolves an installation client for another repository. */
    installation: (repo: string) => Promise<Octokit | undefined>
    /** Repository holding the entries, as `owner/name`. */
    origin: string
    /** Pull request to credit, as `owner/name#number`. */
    pr?: string | undefined
    /** Registry base URL. Overridden in tests. */
    registry?: string | undefined
  }
}

/** Splits entries into those already linked and those still to file, applying the per-run ceiling. */
export function partition(
  entries: readonly Entry.Entry[],
  maxPerRun: number,
): {
  deferred: { id: string; reason: string }[]
  linked: comment.Link[]
  pending: readonly Entry.Entry[]
} {
  const linked: comment.Link[] = []
  const unlinked: Entry.Entry[] = []
  for (const entry of entries) {
    if (entry.issue) linked.push({ id: entry.id, issue: entry.issue })
    else unlinked.push(entry)
  }

  return {
    deferred: unlinked
      .slice(maxPerRun)
      .map((entry) => ({ id: entry.id, reason: `over the ceiling of ${maxPerRun} per run` })),
    linked,
    pending: unlinked.slice(0, maxPerRun),
  }
}
