import { Github, Mirrors } from 'frog'
import type { Octokit } from 'octokit'
import * as AppSync from '../../src/AppSync.js'
import * as config from './internal/config.js'
import * as filing from './internal/file.js'
import * as mirrors from './internal/mirrors.js'
import * as serialization from './internal/serialize.js'
import * as Repository from './Repository.js'

/**
 * Files pending reports and returns issue state for one immutable source commit.
 *
 * The response carries no repository path or report content. The repository-owned Action derives every
 * edit from its own checkout and uses these opaque occurrence digests only to join issue state.
 */
export async function reconcile(options: reconcile.Options): Promise<AppSync.Snapshot> {
  const {
    app,
    client,
    installation,
    registry,
    repo,
    repositoryId,
    serialize = serialization.direct,
    sha,
  } = options

  const [settings, contents, remembered] = await Promise.all([
    config.read(client, { ref: sha, repo }),
    Repository.read(client, { ref: sha, repo }),
    mirrors.read(client, { ref: sha, repo }),
  ])
  if (contents.malformed.length > 0)
    throw new InvalidRepositoryError('The friction log contains a malformed report.')

  const filed = await filing.file({
    app,
    client,
    config: settings,
    entries: filing.partition(contents.entries).pending,
    installation,
    origin: repo,
    ...(registry ? { registry } : {}),
    serialize,
  })

  const bindings = new Map<string, string>()
  const legacy = new Set<string>()
  let complete = filed.deferred.length === 0

  for (const entry of contents.entries) {
    const issue = entry.issue ?? filed.links.get(entry.id)
    if (!issue) {
      complete = false
      continue
    }

    bind(bindings, AppSync.occurrence({ entry }), issue)
  }

  for (const mirror of remembered.mirrors) {
    if (!mirror.occurrence || !Mirrors.toEntry(mirror)) {
      // Old journals cannot restore content, but their issue-only key can still retain or forget the
      // local recovery record without exposing its path.
      const occurrence = AppSync.legacyOccurrence(mirror.issue)
      bind(bindings, occurrence, mirror.issue)
      legacy.add(occurrence)
      continue
    }
    bind(bindings, mirror.occurrence, mirror.issue)
  }

  const clients = new Map<string, Octokit | undefined>([[repo, client]])
  const installed = async (target: string): Promise<Octokit | undefined> => {
    if (clients.has(target)) return clients.get(target)
    const resolved = await installation(target)
    clients.set(target, resolved)
    return resolved
  }

  const states = new Map<string, AppSync.Report>()
  for (const [occurrence, link] of bindings) {
    const parsed = Github.parseLink(link)
    if (!parsed) throw new InvalidRepositoryError('A report has an invalid issue link.')

    const target = await installed(parsed.repo)
    if (!target) {
      complete = false
      continue
    }

    const issue = await Github.get(target.rest, {
      issue: parsed.issue,
      repo: parsed.repo,
    })
    if (issue && issue.author !== app)
      throw new InvalidRepositoryError('A report links to an issue Frog does not own.')
    const state: AppSync.ReportState = (() => {
      if (!issue) return 'missing'
      if (issue.state === 'open' || issue.state === 'closed') return issue.state
      throw new InvalidRepositoryError('A report has an unsupported issue state.')
    })()
    if (state === 'open' && legacy.has(occurrence)) complete = false

    states.set(occurrence, {
      number: parsed.issue,
      repo: parsed.repo,
      state,
    })
  }

  return AppSync.from({
    complete,
    reports: Object.fromEntries([...states].sort(([a], [b]) => a.localeCompare(b))),
    repository: { fullName: repo, id: repositoryId, sha },
    version: 1,
  })
}

function bind(bindings: Map<string, string>, occurrence: string, issue: string): void {
  const current = bindings.get(occurrence)
  if (current && current !== issue)
    throw new InvalidRepositoryError('One report occurrence links to several issues.')
  bindings.set(occurrence, issue)
}

export declare namespace reconcile {
  /** Options for {@link reconcile}. */
  type Options = {
    /** Authenticated GitHub App bot login. */
    app: string
    /** Installation client for the source repository. */
    client: Octokit
    /** Resolves an installation client for a report destination. */
    installation: (repo: string) => Promise<Octokit | undefined>
    /** Registry base URL. Overridden in tests. */
    registry?: string | undefined
    /** Source repository as `owner/name`. */
    repo: string
    /** Immutable GitHub repository id. */
    repositoryId: number
    /** Serializes issue mutations by destination repository. */
    serialize?: serialization.Serialize | undefined
    /** Exact source commit inspected by the repository workflow. */
    sha: string
  }
}

/** Repository state that cannot safely be reconciled through the App boundary. */
export class InvalidRepositoryError extends Error {
  override name = 'Reconcile.InvalidRepositoryError'

  constructor(detail: string) {
    super(`Cannot reconcile this repository. ${detail}`)
  }
}
