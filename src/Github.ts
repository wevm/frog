import { createHash } from 'node:crypto'
import type { Octokit } from '@octokit/rest'
import * as Frictionset from './Frictionset.js'

/**
 * The slice of Octokit this module uses.
 *
 * Narrow on purpose: the App passes Probot's client, which is the same endpoint-methods object, so
 * neither caller has to construct the other's.
 */
export type Client = Pick<Octokit['rest'], 'issues' | 'repos'>

/** A label as GitHub returns it: either the bare name, or an object holding one. */
export type Label =
  | string
  | {
      /** Label name. */
      name?: string | undefined
    }

/** The parts of a GitHub issue this module reads. */
export type Issue = {
  /** Issue body. `null` when GitHub has none, which is how the API reports an empty body. */
  body?: string | null | undefined
  /** Labels on the issue. */
  labels?: readonly Label[] | undefined
  /** Issue number, unique within its repository. */
  number: number
  /** `open` or `closed`. */
  state: string
  /** Issue title. */
  title: string
}

/**
 * Label names on an issue, flattening GitHub's two representations.
 *
 * @returns Every label name, with unnamed entries dropped.
 */
export function toLabelNames(issue: Issue): readonly string[] {
  return (issue.labels ?? [])
    .map((label) => (typeof label === 'string' ? label : label.name))
    .filter((name): name is string => Boolean(name))
}

/**
 * Splits `owner/name` into the shape Octokit wants.
 *
 * @param target - Repository as `owner/name`.
 * @returns Octokit's `{ owner, repo }` pair.
 */
export function split(target: string): { owner: string; repo: string } {
  const [owner = '', repo = ''] = target.split('/')
  return { owner, repo }
}

/**
 * Formats a linked issue as it appears in frontmatter.
 *
 * @returns The link as `owner/name#number`.
 */
export function toLink(options: toLink.Options): string {
  return `${options.repo}#${options.issue}`
}

export declare namespace toLink {
  /** Options for {@link toLink}. */
  type Options = {
    /** Issue number. */
    issue: number
    /** Repository holding the issue, as `owner/name`. */
    repo: string
  }
}

/**
 * Reads a frontmatter issue link.
 *
 * The inverse of {@link toLink}.
 *
 * @param link - Link as `owner/name#number`.
 * @returns The repository and issue number, or `undefined` when the link is malformed.
 */
export function parseLink(link: string): { issue: number; repo: string } | undefined {
  const match = /^([\w.-]+\/[\w.-]+)#(\d+)$/.exec(link)
  if (!match?.[1] || !match[2]) return undefined
  return { issue: Number(match[2]), repo: match[1] }
}

/**
 * Dedupe key for a title.
 *
 * Normalized first, so the same friction reported with different capitalization and punctuation
 * lands on one issue.
 *
 * @param title - Title as written.
 * @returns The first 12 hex characters of the normalized title's sha256.
 */
export function hash(title: string): string {
  return createHash('sha256').update(Frictionset.normalizeTitle(title)).digest('hex').slice(0, 12)
}

/** Marker format version, so a future format change can be recognized rather than misread. */
export const markerVersion = 'v1'

const markerRegex = /<!--\s*frictionsets:v1\s+([^>]*?)\s*-->/

/**
 * Hidden state carried in an issue body.
 *
 * This is the whole basis of idempotency and of sync: it is how a second publish recognizes an issue
 * it already filed, and how an issue event finds the file mirroring it.
 */
export type Marker = {
  /** Dedupe key. */
  hash: string
  /** Repository holding the mirroring file. Lets an issue closed here sync a file elsewhere. */
  origin?: string | undefined
  /** Path of the mirroring file, so close and reopen act without scanning. */
  path?: string | undefined
}

/**
 * Renders the hidden marker embedded in every issue body.
 *
 * @returns An HTML comment, which renders as nothing on GitHub.
 */
export function renderMarker(marker: Marker): string {
  const parts = [`hash=${marker.hash}`]
  if (marker.path) parts.push(`path=${marker.path}`)
  if (marker.origin) parts.push(`origin=${marker.origin}`)
  return `<!-- frictionsets:${markerVersion} ${parts.join(' ')} -->`
}

/**
 * Reads the marker out of an issue body.
 *
 * @param body - Issue body, which may be absent.
 * @returns The marker, or `undefined` for a body with none or with no `hash` field.
 */
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

/**
 * Who hit the friction, and where.
 *
 * Every field is optional: an entry logged moments ago is not committed yet, so none of this is
 * always knowable.
 */
export type Provenance = {
  /** Commit author name, or the GitHub actor when the App files on someone's behalf. */
  author?: string | undefined
  /** Pull request this was logged in, as `owner/name#number`. */
  pr?: string | undefined
  /** Commit the entry was added in. Rendered short. */
  sha?: string | undefined
}

/**
 * Renders an issue body: the entry body, the marker, then a provenance footer.
 *
 * The marker sits directly after the body so `parseBody` can recover the entry by splitting on it.
 * Anything after the marker is presentation and is dropped on the way back.
 *
 * @returns The issue body. {@link parseBody} inverts this exactly.
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
  /** Options for {@link renderBody}. */
  type Options = {
    /** The frictionset body, verbatim. */
    body: string
    /** Hidden state to embed. Its `origin` also appears in the footer. */
    marker: Marker
    /** Attribution for the footer. Omitted entirely when nothing is known. */
    provenance?: Provenance | undefined
  }
}

/**
 * Recovers the frictionset body from an issue body.
 *
 * The inverse of {@link renderBody}, which the reopen path depends on to rebuild a deleted file.
 *
 * @param body - Issue body, which may be absent.
 * @returns The entry body. A body with no marker is returned trimmed but otherwise untouched.
 */
export function parseBody(body: string | null | undefined): string {
  const value = body ?? ''
  const match = markerRegex.exec(value)
  return (match ? value.slice(0, match.index) : value).trim()
}

/**
 * Labels for an entry: the configured set, its severity label, and anything on the entry.
 *
 * @returns Labels in that order, deduplicated.
 */
export function toLabels(options: toLabels.Options): readonly string[] {
  const { frictionset, labels, severityLabels } = options
  return [
    ...new Set([...labels, severityLabels[frictionset.severity], ...(frictionset.labels ?? [])]),
  ]
}

export declare namespace toLabels {
  /** Options for {@link toLabels}. */
  type Options = {
    /** The entry, for its own labels and its severity. */
    frictionset: Pick<Frictionset.Frictionset, 'labels' | 'severity'>
    /** Labels applied to every issue, from config. */
    labels: readonly string[]
    /** Label to apply for each severity, from config. */
    severityLabels: Record<Frictionset.Severity, string>
  }
}

/**
 * Rebuilds an entry from the issue mirroring it.
 *
 * Used when an issue reopens after its file was deleted. `severity` and extra labels are recovered by
 * reversing {@link toLabels}; `target` cannot be, because nothing on the issue records it.
 *
 * @returns The rebuilt entry, already linked to the issue.
 */
export function fromIssue(issue: Issue, options: fromIssue.Options): Frictionset.Frictionset {
  const { id, labels, repo, severityLabels } = options

  const names = toLabelNames(issue)
  const severity =
    Frictionset.severities.find((value) => names.includes(severityLabels[value])) ?? 'minor'
  const managed = new Set<string>([...labels, ...Object.values(severityLabels)])
  const extra = names.filter((name) => !managed.has(name))

  return {
    body: parseBody(issue.body),
    id,
    issue: toLink({ issue: issue.number, repo }),
    severity,
    title: issue.title,
    ...(extra.length ? { labels: extra } : {}),
  }
}

export declare namespace fromIssue {
  /** Options for {@link fromIssue}. */
  type Options = {
    /** Id to give the rebuilt entry, taken from the marker's `path`. */
    id: string
    /** Labels applied to every issue, from config. Excluded from the entry's own labels. */
    labels: readonly string[]
    /** Repository holding the issue, as `owner/name`. */
    repo: string
    /** Label to apply for each severity, from config. Reversed to recover severity. */
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
 *
 * @param client - Authenticated client for the target repository.
 * @returns Issues keyed by dedupe hash. Where several share a hash, the canonical one wins: open
 * before closed, then lowest number.
 */
export async function index(client: Client, options: index.Options): Promise<Map<string, Issue>> {
  const indexed = new Map<string, Issue>()
  for (const issue of await list(client, options)) {
    const key = parseMarker(issue.body)?.hash ?? hash(issue.title)
    // Prefer an open issue, then the lowest number, so comments land on the canonical one.
    const current = indexed.get(key)
    if (!current) indexed.set(key, issue)
    else if (current.state !== 'open' && issue.state === 'open') indexed.set(key, issue)
    else if (current.state === issue.state && issue.number < current.number) indexed.set(key, issue)
  }
  return indexed
}

/**
 * Reads a file from a repository's default branch.
 *
 * Used to check whether a repository has committed a config accepting inbound friction. Always the
 * default branch, never a pull request head: the untrusted side of a boundary must not get to say
 * where issues are filed.
 *
 * @param client - Authenticated client for the repository.
 * @returns The file's contents, or `undefined` when it does not exist or is not a file.
 */
export async function fetchFile(
  client: Client,
  options: fetchFile.Options,
): Promise<string | undefined> {
  try {
    const response = await client.repos.getContent({ ...split(options.repo), path: options.path })
    const data = response.data as { content?: string; encoding?: string; type?: string }
    if (data.type !== 'file' || !data.content) return undefined
    return Buffer.from(data.content, data.encoding === 'base64' ? 'base64' : 'utf8').toString(
      'utf8',
    )
  } catch (error) {
    if ((error as { status?: number }).status === 404) return undefined
    throw error
  }
}

export declare namespace fetchFile {
  /** Options for {@link fetchFile}. */
  type Options = {
    /** Repository-relative path. */
    path: string
    /** Repository to read from, as `owner/name`. */
    repo: string
  }
}

/**
 * One issue by number.
 *
 * Needed because {@link list} filters by label, so an issue that merely lost its label is
 * indistinguishable from one that never existed. Clearing a link on that basis would send the entry
 * back to pending and let the next publish open a duplicate.
 *
 * @param client - Authenticated client for the repository.
 * @returns The issue, or `undefined` when it genuinely does not exist.
 */
export async function get(client: Client, options: get.Options): Promise<Issue | undefined> {
  try {
    const response = await client.issues.get({
      ...split(options.repo),
      issue_number: options.issue,
    })
    return response.data
  } catch (error) {
    if ((error as { status?: number }).status === 404) return undefined
    throw error
  }
}

export declare namespace get {
  /** Options for {@link get}. */
  type Options = {
    /** Issue number. */
    issue: number
    /** Repository holding the issue, as `owner/name`. */
    repo: string
  }
}

/**
 * Every issue frictionsets manages in a repository.
 *
 * @param client - Authenticated client for the repository.
 * @returns Issues carrying the label, oldest first, with pull requests filtered out.
 */
export async function list(client: Client, options: index.Options): Promise<readonly Issue[]> {
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
    // `listForRepo` returns pull requests too.
    collected.push(
      ...response.data.filter((issue) => !('pull_request' in issue && issue.pull_request)),
    )
    if (response.data.length < 100) break
  }
  return collected
}

export declare namespace index {
  /** Options for {@link index}. */
  type Options = {
    /** Label every frictionsets issue in this repository carries. Dedupe keys off it. */
    label: string
    /** Repository to index, as `owner/name`. */
    repo: string
    /** Which issues to consider. Defaults to `all`, so a closed issue still dedupes. */
    state?: 'all' | 'open' | undefined
  }
}

/** What filing an entry did. */
export type Result = {
  /** Number of the issue that now covers the entry. */
  issue: number
  /** `created` opened a new issue, `commented` added to one that already existed. */
  status: 'commented' | 'created'
}

/**
 * Files an entry as an issue, or comments on the issue that already covers it.
 *
 * Commenting rather than opening a duplicate is what makes publishing idempotent, which is required:
 * a pull request `synchronize` event re-runs this over the same entries.
 *
 * @param client - Authenticated client for the target repository.
 * @returns The issue number and whether it was opened or commented on.
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
  /** Options for {@link publish}. */
  type Options = {
    /**
     * Issue already covering this friction, looked up in {@link index}.
     *
     * When set, the entry is added as a comment instead of a new issue.
     */
    existing?: Issue | undefined
    /** The entry, for its title and body. */
    frictionset: Pick<Frictionset.Frictionset, 'body' | 'title'>
    /** Labels for a newly opened issue. Ignored when commenting. */
    labels: readonly string[]
    /** Hidden state to embed, from {@link hash} plus the file path and origin repository. */
    marker: Marker
    /** Attribution for the footer and the comment. */
    provenance?: Provenance | undefined
    /** Repository to file in, as `owner/name`. */
    repo: string
  }
}
