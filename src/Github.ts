import { createHash } from 'node:crypto'
import type { Octokit } from '@octokit/rest'
import * as Frictionset from './Frictionset.js'

/**
 * The slice of Octokit this module uses.
 *
 * Narrow on purpose: the App passes Probot's client, which is the same endpoint-methods object, so
 * neither caller has to construct the other's.
 */
export type Client = Pick<Octokit['rest'], 'issues'>

export type Issue = {
  body?: string | null | undefined
  number: number
  state: string
  title: string
}

/** Splits `owner/name` into the shape Octokit wants. */
export function split(target: string): { owner: string; repo: string } {
  const [owner = '', repo = ''] = target.split('/')
  return { owner, repo }
}

/** Formats a linked issue as it appears in frontmatter. */
export function toLink(options: { issue: number; repo: string }): string {
  return `${options.repo}#${options.issue}`
}

/**
 * Dedupe key for a title.
 *
 * Normalized first, so the same friction reported with different capitalization and punctuation
 * lands on one issue.
 */
export function hash(title: string): string {
  return createHash('sha256').update(Frictionset.normalizeTitle(title)).digest('hex').slice(0, 12)
}

export const markerVersion = 'v1'
const markerRegex = /<!--\s*frictionsets:v1\s+([^>]*?)\s*-->/

export type Marker = {
  /** Dedupe key. */
  hash: string
  /** Repository holding the mirroring file. Lets an issue closed here sync a file elsewhere. */
  origin?: string | undefined
  /** Path of the mirroring file, so close and reopen act without scanning. */
  path?: string | undefined
}

/** Renders the hidden marker appended to every issue body. */
export function renderMarker(marker: Marker): string {
  const parts = [`hash=${marker.hash}`]
  if (marker.path) parts.push(`path=${marker.path}`)
  if (marker.origin) parts.push(`origin=${marker.origin}`)
  return `<!-- frictionsets:${markerVersion} ${parts.join(' ')} -->`
}

/** Reads the marker out of an issue body. */
export function parseMarker(body: string | null | undefined): Marker | undefined {
  const match = markerRegex.exec(body ?? '')
  if (!match?.[1]) return undefined

  const fields = new Map(
    match[1]
      .split(/\s+/)
      .map((part) => part.split('='))
      .filter((pair): pair is [string, string] => pair.length === 2),
  )
  const hash = fields.get('hash')
  if (!hash) return undefined

  return {
    hash,
    ...(fields.get('origin') ? { origin: fields.get('origin') } : {}),
    ...(fields.get('path') ? { path: fields.get('path') } : {}),
  }
}

export type Provenance = {
  /** Commit author name. */
  author?: string | undefined
  /** Pull request this was logged in, as `owner/name#number`. */
  pr?: string | undefined
  /** Commit the entry was added in. */
  sha?: string | undefined
}

/**
 * Renders an issue body: the entry body, the marker, then a provenance footer.
 *
 * The marker sits directly after the body so `parseBody` can recover the entry by splitting on it.
 * Anything after the marker is presentation and is dropped on the way back.
 */
export function renderBody(options: renderBody.Options): string {
  const { body, marker, provenance = {} } = options

  const credits = [
    provenance.author ? `Logged by ${provenance.author}` : 'Logged',
    marker.origin ? `in \`${marker.origin}\`` : undefined,
    provenance.sha ? `at \`${provenance.sha.slice(0, 7)}\`` : undefined,
    provenance.pr ? `via ${provenance.pr}` : undefined,
  ]
    .filter(Boolean)
    .join(' ')

  const footer = `<sub>${credits}. Filed by [frictionsets](https://github.com/wevm/frictionsets).</sub>`

  return `${body.trim()}\n\n${renderMarker(marker)}\n\n---\n\n${footer}\n`
}

export declare namespace renderBody {
  type Options = {
    /** The frictionset body, verbatim. */
    body: string
    marker: Marker
    provenance?: Provenance | undefined
  }
}

/** Recovers the frictionset body from an issue body. */
export function parseBody(body: string | null | undefined): string {
  const value = body ?? ''
  const match = markerRegex.exec(value)
  return (match ? value.slice(0, match.index) : value).trim()
}

/** Labels for an entry: the configured set, its severity label, and anything on the entry. */
export function toLabels(options: toLabels.Options): readonly string[] {
  const { frictionset, labels, severityLabels } = options
  return [
    ...new Set([...labels, severityLabels[frictionset.severity], ...(frictionset.labels ?? [])]),
  ]
}

export declare namespace toLabels {
  type Options = {
    frictionset: Pick<Frictionset.Frictionset, 'labels' | 'severity'>
    labels: readonly string[]
    severityLabels: Record<Frictionset.Severity, string>
  }
}

/**
 * Indexes existing friction issues by dedupe hash.
 *
 * Listing by label rather than searching: the search index is eventually consistent, so two publishes
 * moments apart can both miss and open duplicates. Listing is deterministic and paginates.
 *
 * Issues with no marker are indexed by their title hash, so an issue filed by hand still dedupes.
 */
export async function index(client: Client, options: index.Options): Promise<Map<string, Issue>> {
  const { label, repo, state = 'all' } = options

  const collected: Issue[] = []
  // Paginated rather than one page of 100: missing an older issue would open a duplicate. The page
  // ceiling is a runaway guard, not a real limit; 5,000 friction issues in one repository is not a
  // case worth designing for.
  for (let page = 1; page <= 50; page++) {
    const response = await client.issues.listForRepo({
      ...split(repo),
      labels: label,
      page,
      per_page: 100,
      state,
    })
    collected.push(...response.data)
    if (response.data.length < 100) break
  }

  const indexed = new Map<string, Issue>()
  for (const issue of collected) {
    // `listForRepo` returns pull requests too.
    if ('pull_request' in issue && issue.pull_request) continue
    const key = parseMarker(issue.body)?.hash ?? hash(issue.title)
    // Prefer an open issue, then the lowest number, so comments land on the canonical one.
    const current = indexed.get(key)
    if (!current) indexed.set(key, issue)
    else if (current.state !== 'open' && issue.state === 'open') indexed.set(key, issue)
    else if (current.state === issue.state && issue.number < current.number) indexed.set(key, issue)
  }
  return indexed
}

export declare namespace index {
  type Options = {
    /** Label every frictionsets issue in this repository carries. */
    label: string
    repo: string
    state?: 'all' | 'open' | undefined
  }
}

export type Result = {
  issue: number
  /** `created` opened a new issue, `commented` added to one that already existed. */
  status: 'commented' | 'created'
}

/**
 * Files an entry as an issue, or comments on the issue that already covers it.
 *
 * Commenting rather than opening a duplicate is what makes publishing idempotent, which is required:
 * a pull request `synchronize` event re-runs this over the same entries.
 */
export async function publish(client: Client, options: publish.Options): Promise<Result> {
  const { existing, frictionset, labels, marker, provenance, repo } = options
  const body = renderBody({
    body: frictionset.body,
    marker,
    ...(provenance ? { provenance } : {}),
  })

  if (existing) {
    const note = [
      'Hit again',
      provenance?.author ? `by ${provenance.author}` : undefined,
      marker.origin ? `in \`${marker.origin}\`` : undefined,
      provenance?.pr ? `via ${provenance.pr}` : undefined,
    ]
      .filter(Boolean)
      .join(' ')

    await client.issues.createComment({
      ...split(repo),
      body: `${note}.\n\n${frictionset.body.trim()}\n`,
      issue_number: existing.number,
    })
    return { issue: existing.number, status: 'commented' }
  }

  const created = await client.issues.create({
    ...split(repo),
    body,
    labels: [...labels],
    title: frictionset.title,
  })
  return { issue: created.data.number, status: 'created' }
}

export declare namespace publish {
  type Options = {
    /** Issue already covering this friction, from `index`. */
    existing?: Issue | undefined
    frictionset: Pick<Frictionset.Frictionset, 'body' | 'title'>
    labels: readonly string[]
    marker: Marker
    provenance?: Provenance | undefined
    repo: string
  }
}
