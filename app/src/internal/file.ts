import type { Config, Entry } from 'frog'
import { Github, Store, Target } from 'frog'
import type { Octokit } from 'octokit'
import type * as comment from './comment.js'
import * as resolvers from './resolvers.js'
import * as serialization from './serialize.js'

/** What filing a set of entries did. */
export type Filing = {
  /** Entries that landed on an issue already covering them. */
  commented: comment.Link[]
  /** Entries filed as new issues. */
  created: comment.Link[]
  /** Entries left pending, and why. */
  deferred: comment.Deferred[]
  /** Issue link for each entry that got one, keyed by entry id. */
  links: Map<string, string>
}

/**
 * Resolves each entry's destination, applies every gate, and files what is allowed through.
 *
 * Shared by the pull request and push handlers, which must apply identical gates. They differ only
 * afterwards: one comments, the other writes the links back.
 */
export async function file(options: file.Options): Promise<Filing> {
  const {
    actor,
    client,
    config,
    entries,
    installation,
    origin,
    pr,
    registry,
    serialize = serialization.direct,
  } = options

  const clients = new Map<string, Octokit | undefined>([[origin, client]])
  const installed = async (repo: string): Promise<Octokit | undefined> => {
    if (clients.has(repo)) return clients.get(repo)
    const target = await installation(repo)
    clients.set(repo, target)
    return target
  }

  const stack = resolvers.resolvers({
    outbound: config.outbound,
    installation: installed,
    self: origin,
    ...(registry ? { registry } : {}),
  })

  const deferred: comment.Deferred[] = []

  const candidates: {
    destination: string
    entry: Entry.Entry
    labels?: readonly string[] | undefined
  }[] = []

  for (const entry of entries) {
    const resolution = await Target.resolve(entry.target, stack).catch((error: unknown) => {
      if (error instanceof resolvers.InstallationMissingError) {
        deferred.push({ code: error.code, id: entry.id, reason: error.message })
        return undefined
      }
      throw error
    })
    if (!resolution) continue
    if (!resolution.ok) {
      deferred.push({ code: resolution.code, id: entry.id, reason: resolution.message })
      continue
    }

    const { labels, repo: destination } = resolution.target

    candidates.push({ destination, entry, ...(labels ? { labels } : {}) })
  }

  const commented: comment.Link[] = []
  const created: comment.Link[] = []
  const links = new Map<string, string>()

  for (const destination of new Set(candidates.map((candidate) => candidate.destination))) {
    const target = await installed(destination)
    if (target) continue
    for (const candidate of candidates.filter((entry) => entry.destination === destination))
      deferred.push({
        code: 'INSTALLATION_MISSING',
        id: candidate.entry.id,
        reason: `Frog is not installed on \`${destination}\`.`,
      })
  }

  /** Grouped after every gate. Deferred entries do not consume the per-run ceiling. */
  const groups = new Map<string, { entries: Entry.Entry[]; labels?: readonly string[] }>()
  let accepted = 0
  for (const candidate of candidates) {
    if (!clients.get(candidate.destination)) continue
    if (accepted >= config.maxPerRun) {
      deferred.push({
        code: 'OVER_CEILING',
        id: candidate.entry.id,
        reason: `over the ceiling of ${config.maxPerRun} per run`,
      })
      continue
    }
    accepted += 1

    const group = groups.get(candidate.destination) ?? {
      entries: [],
      ...(candidate.labels ? { labels: candidate.labels } : {}),
    }
    group.entries.push(candidate.entry)
    groups.set(candidate.destination, group)
  }

  for (const [destination, group] of groups) {
    const target = clients.get(destination)
    if (!target) continue

    await serialize(destination, async () => {
      const applied = group.labels?.length ? group.labels : config.labels
      const matcher = await Github.matcher(target.rest, {
        label: applied[0] ?? 'friction',
        repo: destination,
      })
      /** Filed during this run. Two entries sharing a title collapse onto one issue. */
      const seen = new Map<string, Github.Issue>()

      for (const entry of group.entries) {
        const hash = Github.hash(entry.title)
        const existing = seen.get(hash) ?? (await matcher.match(entry.title))

        const result = await Github.publish(target.rest, {
          entry,
          labels: Github.toLabels({
            entry,
            labels: applied,
          }),
          // `origin` is where the entry file lives, not the destination when reporting upstream.
          marker: { hash, origin, path: Store.toPath(entry.id), severity: entry.severity },
          occurrence: Github.occurrence({ entry, origin }),
          provenance: { ...(actor ? { author: actor } : {}), ...(pr ? { pr } : {}) },
          repo: destination,
          ...(existing ? { existing } : {}),
        })

        const issue = Github.toLink({ issue: result.issue, repo: destination })
        links.set(entry.id, issue)
        ;(result.status === 'commented' ? commented : created).push({ id: entry.id, issue })

        if (!existing) seen.set(hash, { number: result.issue, state: 'open', title: entry.title })
      }
    })
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
    /** Entries to resolve and file. Already free of linked ones. */
    entries: readonly Entry.Entry[]
    /** Resolves an installation client for another repository. */
    installation: (repo: string) => Promise<Octokit | undefined>
    /** Repository holding the entries, as `owner/name`. */
    origin: string
    /** Pull request to credit, as `owner/name#number`. */
    pr?: string | undefined
    /** Registry base URL. Overridden in tests. */
    registry?: string | undefined
    /** Serializes conflicting writes by destination repository. */
    serialize?: serialization.Serialize | undefined
  }
}

/** Splits entries into those already linked and those still to file. */
export function partition(entries: readonly Entry.Entry[]): {
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
    linked,
    pending: unlinked,
  }
}
