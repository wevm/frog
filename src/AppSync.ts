import { createHash } from 'node:crypto'
import * as Entry from './Entry.js'
import * as Github from './Github.js'
import * as Mirrors from './Mirrors.js'
import * as Store from './Store.js'

/** State of the issue covering one reported occurrence. */
export type ReportState = 'closed' | 'missing' | 'open'

/** Content-free issue state returned by the Frog App. */
export type Report = {
  /** Issue number in `repo`. */
  number: number
  /** Repository holding the issue, as `owner/name`. */
  repo: string
  /** Current issue state. */
  state: ReportState
}

/** Repository identity bound to a reconciliation snapshot. */
export type Repository = {
  /** Repository name as `owner/name`. */
  fullName: string
  /** Immutable GitHub repository id. */
  id: number
  /** Commit whose report set was inspected. */
  sha: string
}

/**
 * Versioned, content-free reconciliation state returned by the Frog App.
 *
 * Reports are keyed only by their 64-character occurrence digest. File paths and report contents are
 * derived from the checked-out repository.
 */
export type Snapshot = {
  /** Whether the App inspected every report needed for this commit. */
  complete: boolean
  /** Reports keyed by occurrence digest. */
  reports: Readonly<Record<string, Report>>
  /** Repository and commit this state describes. */
  repository: Repository
  /** Snapshot format version. */
  version: 1
}

/** Local edits derived from a content-free App snapshot. */
export type Plan = {
  /** Entries whose deleted issue link should be cleared. */
  clearLink: readonly Entry.Entry[]
  /** Repository-owned mirrors no longer needed. */
  forget: readonly Mirrors.Mirror[]
  /** Mirrors to capture before deleting closed entries. */
  remember: readonly Mirrors.Mirror[]
  /** Ids of entries whose issue closed. */
  remove: readonly string[]
  /** Entries to link or restore from repository-owned contents. */
  write: readonly Entry.Entry[]
}

const occurrenceRegex = /^[0-9a-f]{64}$/
const shaRegex = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/
const reportStates = new Set<ReportState>(['closed', 'missing', 'open'])

/**
 * Validates and normalizes a content-free App snapshot.
 *
 * Unknown fields fail closed at every level.
 */
export function from(value: unknown): Snapshot {
  const snapshot = record(value, 'Expected an object.')
  exact(snapshot, ['complete', 'reports', 'repository', 'version'], 'snapshot')
  if (snapshot['version'] !== 1) throw new InvalidError('Expected version 1.')
  if (typeof snapshot['complete'] !== 'boolean')
    throw new InvalidError('Expected `complete` to be a boolean.')

  const source = record(snapshot['repository'], 'Expected `repository` to be an object.')
  exact(source, ['fullName', 'id', 'sha'], 'repository')
  if (!Number.isSafeInteger(source['id']) || (source['id'] as number) <= 0)
    throw new InvalidError('Expected a positive repository id.')
  if (typeof source['fullName'] !== 'string' || !repository(source['fullName']))
    throw new InvalidError('Expected a repository name as `owner/name`.')
  if (typeof source['sha'] !== 'string' || !shaRegex.test(source['sha']))
    throw new InvalidError('Expected a lowercase 40 or 64 character commit SHA.')

  const values = record(snapshot['reports'], 'Expected `reports` to be an object.')
  const reports: Record<string, Report> = {}
  for (const [occurrence, value_report] of Object.entries(values).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (!occurrenceRegex.test(occurrence))
      throw new InvalidError('Expected report keys to be 64 character occurrence digests.')

    const report = record(value_report, `Expected report \`${occurrence}\` to be an object.`)
    exact(report, ['number', 'repo', 'state'], `report \`${occurrence}\``)
    if (!Number.isSafeInteger(report['number']) || (report['number'] as number) <= 0)
      throw new InvalidError(`Expected report \`${occurrence}\` to have a positive issue number.`)
    if (typeof report['repo'] !== 'string' || !repository(report['repo']))
      throw new InvalidError(`Expected report \`${occurrence}\` to have an issue repository.`)
    if (typeof report['state'] !== 'string' || !reportStates.has(report['state'] as ReportState))
      throw new InvalidError(`Expected report \`${occurrence}\` to have a supported issue state.`)

    reports[occurrence] = {
      number: report['number'] as number,
      repo: report['repo'],
      state: report['state'] as ReportState,
    }
  }

  return {
    complete: snapshot['complete'],
    reports,
    repository: {
      fullName: source['fullName'],
      id: source['id'] as number,
      sha: source['sha'],
    },
    version: 1,
  }
}

/** Deterministic wire representation of a validated snapshot. */
export function serialize(snapshot: Snapshot): string {
  return `${JSON.stringify(from(snapshot), null, 2)}\n`
}

/**
 * Computes the stable digest that joins an App report to one local entry.
 *
 * The snapshot is already bound to an immutable repository id, so only the entry id and body are
 * hashed. This keeps the digest stable when a repository is renamed.
 */
export function occurrence(options: occurrence.Options): string {
  return createHash('sha256')
    .update(JSON.stringify([options.entry.id, options.entry.body]))
    .digest('hex')
}

export declare namespace occurrence {
  /** Options for {@link occurrence}. */
  type Options = {
    /** Local entry being reconciled. */
    entry: Entry.Entry
  }
}

/**
 * Computes the content-free key for a recovery record written before occurrence snapshots existed.
 *
 * Legacy records cannot restore content, but this key lets a complete snapshot safely retain or forget
 * them without sending their repository path to the App.
 */
export function legacyOccurrence(issue: string): string {
  return createHash('sha256').update(`legacy:v1:${issue}`).digest('hex')
}

/**
 * Computes local edits without accepting paths or contents from the App.
 *
 * Closed and missing states are applied only from a complete snapshot. Reopened entries are restored
 * only from serialized contents already committed in the repository mirror journal.
 */
export function plan(snapshot: Snapshot, options: plan.Options): Plan {
  const state = from(snapshot)
  const { entries } = options
  const mirrors = Mirrors.from({ mirrors: options.mirrors ?? [], version: 1 }).mirrors
  const reports = new Map<string, Report>(Object.entries(state.reports))

  const entriesByOccurrence = new Map<string, Entry.Entry>()
  const entriesByPath = new Map<string, Entry.Entry>()
  for (const entry of entries) {
    const digest = occurrence({ entry })
    if (entriesByOccurrence.has(digest))
      throw new PlanError(`Several local entries resolve to occurrence \`${digest}\`.`)
    entriesByOccurrence.set(digest, entry)
    entriesByPath.set(Store.toPath(entry.id), entry)
  }

  const mirrorsByOccurrence = new Map<string, Mirrors.Mirror>()
  const legacyByOccurrence = new Map<string, Mirrors.Mirror[]>()
  for (const mirror of mirrors) {
    const entry = Mirrors.toEntry(mirror)
    if (entry && mirror.occurrence) {
      const digest = occurrence({ entry })
      if (digest !== mirror.occurrence)
        throw new PlanError(`Mirror \`${mirror.path}\` has an invalid occurrence digest.`)
      if (mirrorsByOccurrence.has(digest))
        throw new PlanError(`Several mirrors resolve to occurrence \`${digest}\`.`)
      mirrorsByOccurrence.set(digest, mirror)
      continue
    }

    const digest = legacyOccurrence(mirror.issue)
    const values = legacyByOccurrence.get(digest) ?? []
    values.push(mirror)
    legacyByOccurrence.set(digest, values)
  }

  if (state.complete) {
    for (const [digest, entry] of entriesByOccurrence) {
      if (!entry.issue) continue
      const report = reports.get(digest)
      if (!report || toLink(report) !== entry.issue)
        throw new PlanError(`Linked entry \`${entry.id}\` has no matching App report.`)
    }

    for (const mirror of mirrors) {
      const digest = mirror.occurrence ?? legacyOccurrence(mirror.issue)
      const report = reports.get(digest)
      if (!report || toLink(report) !== mirror.issue)
        throw new PlanError(`Mirror \`${mirror.path}\` has no matching App report.`)
    }
  }

  const clearLink: Entry.Entry[] = []
  const forget = new Map<string, Mirrors.Mirror>()
  const matched = new Set<string>()
  const remember = new Map<string, Mirrors.Mirror>()
  const remove = new Set<string>()
  const write = new Map<string, Entry.Entry>()

  for (const [digest, report] of reports) {
    const issue = toLink(report)
    const entry = entriesByOccurrence.get(digest)
    const mirror = mirrorsByOccurrence.get(digest)
    const legacy = legacyByOccurrence.get(digest) ?? []

    if (entry?.issue && entry.issue !== issue)
      throw new PlanError(
        `Occurrence \`${digest}\` is linked to both \`${entry.issue}\` and \`${issue}\`.`,
      )
    if (mirror && mirror.issue !== issue)
      throw new PlanError(
        `Occurrence \`${digest}\` is mirrored to both \`${mirror.issue}\` and \`${issue}\`.`,
      )
    if (legacy.some((value) => value.issue !== issue))
      throw new PlanError(`Legacy occurrence \`${digest}\` resolves to a different issue.`)

    const relevantMirrors = [
      ...(mirror ? [mirror] : []),
      ...legacy.filter((value) => !mirror || value.path !== mirror.path),
    ]
    if (entry && relevantMirrors.some((value) => value.path !== Store.toPath(entry.id)))
      throw new PlanError(`Occurrence \`${digest}\` resolves to conflicting local paths.`)

    if (!entry && relevantMirrors.length === 0) continue
    matched.add(digest)

    if (report.state === 'open') {
      if (entry) {
        if (!entry.issue) write.set(entry.id, { ...entry, issue })
        if (state.complete) for (const value of relevantMirrors) forget.set(mirrorKey(value), value)
        continue
      }

      if (!mirror) {
        if (state.complete)
          throw new PlanError(`Legacy mirror for occurrence \`${digest}\` cannot be restored.`)
        continue
      }
      if (entriesByPath.has(mirror.path)) {
        if (state.complete) forget.set(mirrorKey(mirror), mirror)
        continue
      }
      const restored = Mirrors.toEntry(mirror)
      if (!restored) throw new PlanError(`Mirror \`${mirror.path}\` cannot be restored.`)
      write.set(restored.id, restored)
      if (state.complete) forget.set(mirrorKey(mirror), mirror)
      continue
    }

    if (!state.complete) continue

    if (report.state === 'closed') {
      if (!entry) continue
      const linked = entry.issue ? entry : { ...entry, issue }
      const value: Mirrors.Mirror = {
        contents: Entry.serialize(linked),
        issue,
        occurrence: digest,
        path: Store.toPath(entry.id),
      }
      remember.set(mirrorKey(value), value)
      remove.add(entry.id)
      continue
    }

    if (entry?.issue) {
      const { issue: _, ...cleared } = entry
      clearLink.push(cleared)
    }
    for (const value of relevantMirrors) forget.set(mirrorKey(value), value)
  }

  if (state.complete) {
    const extra = [...reports.keys()].find((digest) => !matched.has(digest))
    if (extra) throw new PlanError(`App report \`${extra}\` has no local entry or mirror.`)
  }

  return {
    clearLink: clearLink.sort((a, b) => a.id.localeCompare(b.id)),
    forget: [...forget.values()].sort((a, b) => mirrorKey(a).localeCompare(mirrorKey(b))),
    remember: [...remember.values()].sort((a, b) => mirrorKey(a).localeCompare(mirrorKey(b))),
    remove: [...remove].sort(),
    write: [...write.values()].sort((a, b) => a.id.localeCompare(b.id)),
  }
}

export declare namespace plan {
  /** Options for {@link plan}. */
  type Options = {
    /** Entries read from the checked-out repository. */
    entries: readonly Entry.Entry[]
    /** Recovery records read from the checked-out repository. */
    mirrors?: readonly Mirrors.Mirror[] | undefined
  }
}

/** Whether a local reconciliation plan changes anything. */
export function empty(value: Plan): boolean {
  return (
    value.clearLink.length === 0 &&
    value.forget.length === 0 &&
    value.remember.length === 0 &&
    value.remove.length === 0 &&
    value.write.length === 0
  )
}

/** Formats the issue binding carried by one content-free report. */
export function toLink(report: Pick<Report, 'number' | 'repo'>): string {
  return Github.toLink({ issue: report.number, repo: report.repo })
}

function mirrorKey(mirror: Mirrors.Mirror): string {
  return `${mirror.issue}\u0000${mirror.path}`
}

function repository(value: string): boolean {
  return Github.parseRepository(value) === value
}

function record(value: unknown, detail: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new InvalidError(detail)
  return value as Record<string, unknown>
}

function exact(value: Record<string, unknown>, keys: readonly string[], name: string): void {
  const expected = new Set(keys)
  const unknown = Object.keys(value).filter((key) => !expected.has(key))
  const missing = keys.filter((key) => !Object.hasOwn(value, key))
  if (unknown.length || missing.length)
    throw new InvalidError(`Expected exact ${name} fields: ${keys.join(', ')}.`)
}

/** Thrown when App reconciliation state does not match its strict wire contract. */
export class InvalidError extends Error {
  /** Stable error name. */
  override name = 'AppSync.InvalidError'
  /** Machine-readable error code. */
  code = 'INVALID_APP_SYNC_STATE' as const

  constructor(detail: string) {
    super(`App reconciliation state is invalid. ${detail}`)
  }
}

/** Thrown when valid App state cannot be safely mapped onto the checked-out repository. */
export class PlanError extends Error {
  /** Stable error name. */
  override name = 'AppSync.PlanError'
  /** Machine-readable error code. */
  code = 'INVALID_APP_SYNC_PLAN' as const

  constructor(detail: string) {
    super(`App reconciliation cannot be applied. ${detail}`)
  }
}
