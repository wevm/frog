import { createHash } from 'node:crypto'
import type { Octokit } from '@octokit/rest'
import * as Entry from './Entry.js'

/**
 * The slice of Octokit this module uses.
 *
 * Narrow so the App can pass Probot's client, which is the same endpoint-methods object.
 */
export type Client = Pick<Octokit['rest'], 'issues' | 'repos'> &
  Partial<Pick<Octokit['rest'], 'git'>>

/** Maximum repository file size read into a Frog process. */
export const maxFileBytes = 8 * 1_024 * 1_024

/** A label as GitHub returns it: either the bare name, or an object holding one. */
export type Label =
  | string
  | {
      /** Label name. */
      name?: string | undefined
    }

/** The parts of a GitHub issue this module reads. */
export type Issue = {
  /** GitHub login of the issue author. */
  author?: string | undefined
  /** Issue body. `null` when the API reports an empty body. */
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

type IssueSource = Omit<Issue, 'author'> & {
  user?: { login?: string | undefined } | null | undefined
}

/** Flattens GitHub's nested user shape into the transport-independent issue shape. */
function normalizeIssue(issue: IssueSource): Issue {
  return {
    body: issue.body,
    labels: issue.labels,
    number: issue.number,
    state: issue.state,
    title: issue.title,
    ...(issue.user?.login ? { author: issue.user.login } : {}),
  }
}

/**
 * Lists the label names on an issue, flattening GitHub's two representations.
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

/** npm's shorthand forms: `owner/name`, optionally prefixed with `github:`. */
const shorthandRegex = /^(?:github:)?([\w.-]+)\/([\w.-]+)$/

/** Git's scp-like SSH form, which `URL` cannot parse. */
const scpRegex = /^(?:[^@\s]+@)?github\.com:([\w.-]+)\/([\w.-]+?)(?:\.git)?$/

const componentRegex = /^[\w.-]+$/

/**
 * Normalizes a repository reference into `owner/name`.
 *
 * Accepts `git+https`, `ssh`, `scp`, and `git` URLs, npm's `github:owner/name` and bare `owner/name`
 * shorthands, and URLs carrying a trailing subdirectory.
 *
 * @param value - A repository URL or npm shorthand.
 * @returns The repository as `owner/name`, or `undefined` when it is absent or not on GitHub.
 */
export function parseRepository(
  value: string | undefined,
  options: parseRepository.Options = {},
): string | undefined {
  if (!value) return undefined

  const shorthand = options.shorthand === false ? undefined : shorthandRegex.exec(value)
  if (shorthand) return `${shorthand[1]}/${shorthand[2]}`

  const scp = scpRegex.exec(value)
  if (scp) return `${scp[1]}/${scp[2]}`

  try {
    const url = new URL(value.startsWith('git+') ? value.slice(4) : value)
    if (url.hostname.toLowerCase() !== 'github.com') return undefined

    const [owner, rawName] = url.pathname.replace(/^\/+/, '').split('/')
    const name = rawName?.replace(/\.git$/, '')
    if (!owner || !name || !componentRegex.test(owner) || !componentRegex.test(name))
      return undefined

    return `${owner}/${name}`
  } catch {
    return undefined
  }
}

export declare namespace parseRepository {
  /** Parsing controls for contexts such as git remotes, where npm shorthand is not meaningful. */
  type Options = {
    /** Whether to accept npm's `owner/name` and `github:owner/name` shorthand. Defaults to `true`. */
    shorthand?: boolean | undefined
  }
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
 * Hashes a title into a dedupe key.
 *
 * @param title - Title as written.
 * @returns The first 12 hex characters of the normalized title's sha256.
 */
export function hash(title: string): string {
  return createHash('sha256').update(Entry.normalizeTitle(title)).digest('hex').slice(0, 12)
}

/**
 * Stable key for one report of one friction.
 *
 * Includes the body verbatim so editing an entry creates a new occurrence.
 */
export function occurrence(options: occurrence.Options): string {
  const { entry, origin } = options
  return [origin, entry.id, entry.body].join(':')
}

export declare namespace occurrence {
  /** Options for {@link occurrence}. */
  type Options = {
    /** Entry being reported. */
    entry: Entry.Entry
    /** Repository holding the entry, as `owner/name`. */
    origin: string
  }
}

/** Marker format version, so a later format change is recognized rather than misread. */
export const markerVersion = 'v1'

const markerRegex = /<!--\s*frog:v1\s+([^>]*?)\s*-->/

/** Every Frog comment, for stripping a write-up that carries one of its own. */
const markerStripRegex = /\s*<!--\s*frog:[^>]*-->/g

function stripMarkers(body: string): string {
  return body.replace(markerStripRegex, '').trim()
}

/**
 * Last marker in a body.
 *
 * Frog appends its own after the write-up, so reading the last one means a marker embedded in
 * author-controlled text cannot stand in for it.
 */
function lastMarker(value: string): RegExpExecArray | undefined {
  const pattern = new RegExp(markerRegex.source, 'g')
  let last: RegExpExecArray | undefined
  for (let match = pattern.exec(value); match; match = pattern.exec(value)) last = match
  return last
}

/** Format version of the marker that makes one external publish occurrence replay-safe. */
const occurrenceVersion = 'v1'

function renderOccurrence(occurrence: string): string {
  const digest = createHash('sha256').update(occurrence).digest('hex')
  return `<!-- frog:occurrence:${occurrenceVersion} ${digest} -->`
}

/**
 * Finds where an occurrence is already recorded on an issue.
 *
 * @returns `created` for the issue body, `commented` for a comment, or `undefined`.
 */
export async function findOccurrence(
  client: Client,
  options: findOccurrence.Options,
): Promise<Result['status'] | undefined> {
  const marker = renderOccurrence(options.occurrence)
  if (
    (!options.expectedAuthor || options.existing.author === options.expectedAuthor) &&
    options.existing.body?.includes(marker)
  )
    return 'created'

  for (let page = 1; ; page++) {
    const response = await client.issues.listComments({
      ...split(options.repo),
      issue_number: options.existing.number,
      page,
      per_page: 100,
    })
    if (
      response.data.some(
        (comment) =>
          (!options.expectedAuthor || comment.user?.login === options.expectedAuthor) &&
          comment.body?.includes(marker),
      )
    )
      return 'commented'
    if (response.data.length < 100) return undefined
  }
}

export declare namespace findOccurrence {
  /** Options for {@link findOccurrence}. */
  type Options = {
    /** Author whose occurrence markers are trusted. Every author is trusted when omitted. */
    expectedAuthor?: string | undefined
    /** Issue that may already carry the occurrence. */
    existing: Issue
    /** Stable occurrence key from {@link occurrence}. */
    occurrence: string
    /** Repository holding the issue, as `owner/name`. */
    repo: string
  }
}

/**
 * Hidden state carried in an issue body.
 *
 * Lets a second publish recognize an issue it already filed, and an issue event find the file
 * mirroring it.
 */
export type Marker = {
  /** Dedupe key. */
  hash: string
  /** Repository holding the mirroring file. Lets an issue closed here sync a file elsewhere. */
  origin?: string | undefined
  /** Path of the mirroring file. */
  path?: string | undefined
  /** How much the friction hurt. A reopen restores the entry at this severity. */
  severity?: Entry.Severity | undefined
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
  if (marker.severity) parts.push(`severity=${marker.severity}`)
  return `<!-- frog:${markerVersion} ${parts.join(' ')} -->`
}

/**
 * Reads the marker out of an issue body.
 *
 * @param body - Issue body, which may be absent.
 * @returns The marker, or `undefined` for a body with none or with no `hash` field.
 */
export function parseMarker(body: string | null | undefined): Marker | undefined {
  const match = lastMarker(body ?? '')
  if (!match?.[1]) return undefined

  const fields = new Map(
    match[1]
      .split(/\s+/)
      .map((part) => part.split('='))
      .filter((pair): pair is [string, string] => pair.length === 2),
  )
  const hash = fields.get('hash')
  if (!hash) return undefined

  const severity = Entry.severities.find((value) => value === fields.get('severity'))

  return {
    hash,
    ...(fields.get('origin') ? { origin: fields.get('origin') } : {}),
    ...(fields.get('path') ? { path: fields.get('path') } : {}),
    ...(severity ? { severity } : {}),
  }
}

/**
 * Who hit the friction, and where.
 *
 * Every field is optional: an entry logged moments ago is not committed yet.
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
  const { body, marker, occurrence, provenance = {} } = options

  const credits = [
    provenance.author ? `Logged by ${provenance.author}` : 'Logged',
    marker.origin ? `in \`${marker.origin}\`` : undefined,
    provenance.sha ? `at \`${provenance.sha.slice(0, 7)}\`` : undefined,
    provenance.pr ? `via ${provenance.pr}` : undefined,
  ]
    .filter(Boolean)
    .join(' ')

  const footer = `<sub>${credits}. Filed by [Frog](https://github.com/wevm/frog).</sub>`

  const markers = [renderMarker(marker), occurrence ? renderOccurrence(occurrence) : undefined]
    .filter(Boolean)
    .join('\n')

  return `${stripMarkers(body)}\n\n${markers}\n\n---\n\n${footer}\n`
}

export declare namespace renderBody {
  /** Options for {@link renderBody}. */
  type Options = {
    /** The entry body, verbatim. */
    body: string
    /** Hidden state to embed. Its `origin` also appears in the footer. */
    marker: Marker
    /** Stable key for one external publish occurrence. */
    occurrence?: string | undefined
    /** Attribution for the footer. Omitted entirely when nothing is known. */
    provenance?: Provenance | undefined
  }
}

/**
 * Recovers the entry body from an issue body.
 *
 * The inverse of {@link renderBody}. The reopen path uses it to rebuild a deleted file.
 *
 * @param body - Issue body, which may be absent.
 * @returns The entry body. A body with no marker is returned trimmed but otherwise untouched.
 */
export function parseBody(body: string | null | undefined): string {
  const value = body ?? ''
  const match = lastMarker(value)
  return (match ? value.slice(0, match.index) : value).trim()
}

/**
 * Labels for an entry: the configured set, its severity label, and anything on the entry.
 *
 * @returns Labels in that order, deduplicated.
 */
export function toLabels(options: toLabels.Options): readonly string[] {
  const { entry, labels } = options
  return [...new Set([...labels, ...(entry.labels ?? [])])]
}

export declare namespace toLabels {
  /** Options for {@link toLabels}. */
  type Options = {
    /** The entry, for its own labels and its severity. */
    entry: Pick<Entry.Entry, 'labels' | 'severity'>
    /** Labels applied to every issue, from config. */
    labels: readonly string[]
  }
}

/**
 * Rebuilds an entry from the issue mirroring it.
 *
 * Used when an issue reopens after its file was deleted. Severity comes from the marker and extra
 * labels from reversing {@link toLabels}. `target` cannot be recovered: nothing on the issue records it.
 *
 * @returns The rebuilt entry, already linked to the issue.
 */
export function fromIssue(issue: Issue, options: fromIssue.Options): Entry.Entry {
  const { id, labels, repo } = options

  const names = toLabelNames(issue)
  // From the marker, not the labels: cross-repo, the two projects need not agree on what a severity
  // is called.
  const severity = parseMarker(issue.body)?.severity ?? 'minor'
  const managed = new Set<string>(labels)
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
  }
}

/**
 * Indexes existing friction issues by dedupe hash.
 *
 * Lists by label rather than searching. The search index is eventually consistent, so two publishes
 * moments apart can both miss and open duplicates.
 *
 * Issues with no marker are indexed by their title hash. An issue filed by hand still dedupes.
 *
 * @param client - Authenticated client for the target repository.
 * @returns Issues keyed by dedupe hash. Where several share a hash, the canonical one is kept: open
 * before closed, then lowest number.
 */
export async function index(client: Client, options: index.Options): Promise<Map<string, Issue>> {
  return toIndex(await list(client, options))
}

function toIndex(issues: readonly Issue[]): Map<string, Issue> {
  const indexed = new Map<string, Issue>()
  for (const issue of issues) {
    const key = parseMarker(issue.body)?.hash ?? hash(issue.title)
    // Prefer an open issue, then the lowest number.
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
 * Used to check whether a repository has committed a config accepting inbound friction. Reads the
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
    const response = await client.repos.getContent({
      ...split(options.repo),
      path: options.path,
      ...(options.ref ? { ref: options.ref } : {}),
    })
    const data = response.data as {
      content?: string
      encoding?: string
      sha?: string
      size?: number
      type?: string
    }
    if (data.type !== 'file') return undefined
    if (data.size !== undefined && data.size > maxFileBytes)
      throw new FileTooLargeError(options.path)

    if (data.content || !data.sha || data.size === 0)
      return decode(data.content ?? '', data.encoding, options.path)

    if (!client.git) throw new GitBlobUnavailableError(options.path)
    const blob = await client.git.getBlob({
      ...split(options.repo),
      file_sha: data.sha,
    })
    if (blob.data.size !== null && blob.data.size > maxFileBytes)
      throw new FileTooLargeError(options.path)
    return decode(blob.data.content, blob.data.encoding, options.path)
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
    /** Commit, branch, or tag to read at. Defaults to the repository's default branch. */
    ref?: string | undefined
    /** Repository to read from, as `owner/name`. */
    repo: string
  }
}

function decode(contents: string, encoding: string | undefined, path: string): string {
  const bytes = Buffer.from(contents, encoding === 'base64' ? 'base64' : 'utf8')
  if (bytes.byteLength > maxFileBytes) throw new FileTooLargeError(path)
  return bytes.toString('utf8')
}

/** Repository file that exceeds Frog's bounded read limit. */
export class FileTooLargeError extends Error {
  /** Stable error name. */
  override name = 'Github.FileTooLargeError'

  constructor(path: string) {
    super(`\`${path}\` exceeds Frog's ${maxFileBytes}-byte read limit.`)
  }
}

class GitBlobUnavailableError extends Error {
  override name = 'Github.GitBlobUnavailableError'

  constructor(path: string) {
    super(`GitHub truncated \`${path}\`, but this client cannot read its Git blob.`)
  }
}

/**
 * Lists the directories directly inside a directory.
 *
 * An entry is a directory, so this enumerates entries without cloning, including at a pull request
 * head.
 *
 * @param client - Authenticated client for the repository.
 * @returns Repository-relative paths of subdirectories, excluding files. Empty when the directory does
 * not exist.
 */
export async function listDirectories(
  client: Client,
  options: fetchFile.Options,
): Promise<readonly string[]> {
  return listing(client, options, 'dir')
}

/**
 * Lists the files directly inside a directory.
 *
 * @param client - Authenticated client for the repository.
 * @returns Repository-relative paths of files, excluding subdirectories. Empty when the directory does
 * not exist.
 */
export async function listFiles(
  client: Client,
  options: fetchFile.Options,
): Promise<readonly string[]> {
  return listing(client, options, 'file')
}

/** Lists one kind of child, treating an absent directory as empty. */
async function listing(
  client: Client,
  options: fetchFile.Options,
  type: 'dir' | 'file',
): Promise<readonly string[]> {
  try {
    const response = await client.repos.getContent({
      ...split(options.repo),
      path: options.path,
      ...(options.ref ? { ref: options.ref } : {}),
    })
    if (!Array.isArray(response.data)) return []
    return response.data.filter((entry) => entry.type === type).map((entry) => entry.path)
  } catch (error) {
    if ((error as { status?: number }).status === 404) return []
    throw error
  }
}

/**
 * Reads one issue by number.
 *
 * Needed because {@link list} filters by label: an issue that merely lost its label is
 * indistinguishable from one that never existed. Clearing a link on that basis would let the next
 * publish open a duplicate.
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
    return normalizeIssue(response.data)
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
 * Checks whether the token may label issues in a repository.
 *
 * GitHub silently drops `labels` on issue creation for a token without push access, the normal case
 * when reporting friction upstream. {@link index} then cannot find the issue afterwards, because it
 * finds issues by that label. {@link find} is the fallback.
 *
 * @param client - Authenticated client for the repository.
 * @returns Whether labels will stick. Defaults to `false` when the answer cannot be read, which only
 * costs the slower, label-independent lookup.
 */
export async function permissions(
  client: Client,
  options: { repo: string },
): Promise<{ push: boolean }> {
  try {
    const response = await client.repos.get(split(options.repo))
    return { push: response.data.permissions?.push === true }
  } catch {
    return { push: false }
  }
}

/**
 * Reads a repository's default branch.
 *
 * Needed to commit a reconciliation: an issue event says nothing about which branch mirrors it.
 *
 * @param client - Authenticated client for the repository.
 * @returns The branch name, or `undefined` when the repository cannot be read.
 */
export async function defaultBranch(
  client: Client,
  options: { repo: string },
): Promise<string | undefined> {
  try {
    const response = await client.repos.get(split(options.repo))
    return response.data.default_branch
  } catch (error) {
    if ((error as { status?: number }).status === 404) return undefined
    throw error
  }
}

/**
 * Finds the issue already covering a friction, without relying on a label.
 *
 * Lists issues directly rather than using GitHub's eventually consistent search index. Used only
 * where {@link index} cannot work: a repository the token cannot label.
 *
 * @param client - Authenticated client for the repository.
 * @returns The issue covering this friction, or `undefined`.
 */
export async function find(client: Client, options: find.Options): Promise<Issue | undefined> {
  const { hash: key, repo } = options
  const candidates = await listAll(client, { repo })

  // A marker is proof. A matching normalized title is the fallback, catching an issue filed by hand.
  return (
    candidates.find((item) => parseMarker(item.body)?.hash === key) ??
    candidates.find((item) => hash(item.title) === key)
  )
}

export declare namespace find {
  /** Options for {@link find}. */
  type Options = {
    /** Dedupe key from {@link hash}. */
    hash: string
    /** Repository to search, as `owner/name`. */
    repo: string
    /** Title to search for. */
    title: string
  }
}

/**
 * Lists every issue Frog manages in a repository.
 *
 * @param client - Authenticated client for the repository.
 * @returns Issues carrying the label, oldest first, with pull requests filtered out.
 */
export async function list(client: Client, options: index.Options): Promise<readonly Issue[]> {
  const { label, repo, state = 'all' } = options

  const collected: Issue[] = []
  // Paginated rather than one page of 100: missing an older issue would open a duplicate. The page
  // ceiling is a runaway guard, not a real limit.
  for (let page = 1; page <= 50; page++) {
    const response = await client.issues.listForRepo({
      ...split(repo),
      direction: 'asc',
      labels: label,
      page,
      per_page: 100,
      sort: 'created',
      state,
    })
    // `listForRepo` returns pull requests too.
    collected.push(
      ...response.data
        .filter((issue) => !('pull_request' in issue && issue.pull_request))
        .map(normalizeIssue),
    )
    if (response.data.length < 100) break
  }
  return collected
}

async function listAll(client: Client, options: { repo: string }): Promise<readonly Issue[]> {
  const collected: Issue[] = []
  for (let page = 1; page <= 50; page++) {
    const response = await client.issues.listForRepo({
      ...split(options.repo),
      direction: 'asc',
      page,
      per_page: 100,
      sort: 'created',
      state: 'all',
    })
    collected.push(
      ...response.data
        .filter((issue) => !('pull_request' in issue && issue.pull_request))
        .map(normalizeIssue),
    )
    if (response.data.length < 100) break
  }
  return collected
}

export declare namespace index {
  /** Options for {@link index}. */
  type Options = {
    /** Label every Frog issue in this repository carries. Dedupe keys off it. */
    label: string
    /** Repository to index, as `owner/name`. */
    repo: string
    /** Which issues to consider. Defaults to `all`, which dedupes against closed issues too. */
    state?: 'all' | 'open' | undefined
  }
}

/** What filing an entry did. */
export type Result = {
  /** Number of the issue that now covers the entry. */
  issue: number
  /** Whether this call changed GitHub state. */
  mutated?: boolean | undefined
  /** `created` opened a new issue, `commented` added to one that already existed. */
  status: 'commented' | 'created'
}

/** A dedupe lookup, plus whether labels will actually be applied. */
export type Matcher = {
  /** Whether the token may label issues here. When false, the receiver's labels are dropped. */
  labelled: boolean
  /**
   * Finds the issue already covering a title.
   *
   * @param title - Entry title.
   */
  match: (title: string) => Promise<Issue | undefined>
}

/**
 * Prepares dedupe for a repository, choosing a strategy the token can actually use.
 *
 * With push access, issues are indexed by label first. A miss falls back to one unfiltered listing,
 * which also covers labels removed by users or dropped during creation. Without push access, that
 * fallback is the primary index.
 *
 * @param client - Authenticated client for the repository.
 */
export async function matcher(client: Client, options: matcher.Options): Promise<Matcher> {
  const { push } = await permissions(client, { repo: options.repo })
  const accepts = (issue: Issue) =>
    !options.expectedAuthor || issue.author === options.expectedAuthor
  const labelled = push
    ? toIndex((await list(client, options)).filter(accepts))
    : new Map<string, Issue>()
  let unlabelled: Promise<Map<string, Issue>> | undefined

  return {
    labelled: push,
    match: async (title) => {
      const key = hash(title)
      const existing = labelled.get(key)
      if (existing) return existing

      // Even a token with push access can encounter an issue whose configured label was removed.
      // The fallback listing runs once per filing group, so a replay still finds the side effect.
      unlabelled ??= listAll(client, options).then((issues) => toIndex(issues.filter(accepts)))
      return (await unlabelled).get(key)
    },
  }
}

export declare namespace matcher {
  /** Options for {@link matcher}. */
  type Options = index.Options & {
    /** Issue author eligible for matching. Every author is eligible when omitted. */
    expectedAuthor?: string | undefined
  }
}

/**
 * Files an entry as an issue, or comments on the issue that already covers it.
 *
 * Publishing has to be idempotent: a pull request `synchronize` event re-runs this over the same
 * entries.
 *
 * @param client - Authenticated client for the target repository.
 * @returns The issue number and whether it was opened or commented on.
 */
export async function publish(client: Client, options: publish.Options): Promise<Result> {
  const { entry, expectedAuthor, labels, marker, occurrence, provenance, repo } = options
  const existing =
    options.existing && (!expectedAuthor || options.existing.author === expectedAuthor)
      ? options.existing
      : undefined
  const body = renderBody({
    body: entry.body,
    marker,
    ...(occurrence ? { occurrence } : {}),
    ...(provenance ? { provenance } : {}),
  })

  if (existing) {
    // A replay of a report already made, whatever the issue's state. Reopening here would fight a
    // maintainer who closed the issue while its entry was still in the log, on every push. A genuine
    // recurrence carries a new entry id, so its occurrence differs and it falls through to reopen.
    if (occurrence) {
      const status = await findOccurrence(client, {
        existing,
        occurrence,
        repo,
        ...(expectedAuthor ? { expectedAuthor } : {}),
      })
      if (status) return { issue: existing.number, mutated: false, status }
    }

    if (existing.state !== 'open')
      await client.issues.update({
        ...split(repo),
        issue_number: existing.number,
        state: 'open',
      })

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
      body: `${note}.\n\n${stripMarkers(entry.body)}${
        occurrence ? `\n\n${renderOccurrence(occurrence)}` : ''
      }\n`,
      issue_number: existing.number,
    })
    return { issue: existing.number, mutated: true, status: 'commented' }
  }

  const created = await client.issues.create({
    ...split(repo),
    body,
    labels: [...labels],
    title: entry.title,
  })
  return { issue: created.data.number, mutated: true, status: 'created' }
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
    /** Author required for an existing issue and its replay markers. Every author is trusted when omitted. */
    expectedAuthor?: string | undefined
    /** The entry, for its title and body. */
    entry: Pick<Entry.Entry, 'body' | 'title'>
    /** Labels for a newly opened issue. Ignored when commenting. */
    labels: readonly string[]
    /** Hidden state to embed, from {@link hash} plus the file path and origin repository. */
    marker: Marker
    /** Stable key used to suppress a replay of this exact create or comment. */
    occurrence?: string | undefined
    /** Attribution for the footer and the comment. */
    provenance?: Provenance | undefined
    /** Repository to file in, as `owner/name`. */
    repo: string
  }
}
