import fs from 'node:fs/promises'
import path from 'node:path'
import * as Entry from './Entry.js'
import * as Github from './Github.js'
import * as Store from './Store.js'

/** Repository-relative path of the committed mirror recovery journal. */
export const file = `${Store.dir}/.sync.json`

/** A deleted local mirror that can be restored if its issue reopens. */
export type Mirror = {
  /**
   * Canonical serialized entry contents captured before deletion.
   *
   * Present together with `occurrence`, absent on journals written before snapshots were introduced.
   */
  contents?: string | undefined
  /** Issue the entry mirrored, as `owner/name#number`. */
  issue: string
  /**
   * Stable 64-character occurrence digest for the captured entry.
   *
   * Present together with `contents`, absent on journals written before snapshots were introduced.
   */
  occurrence?: string | undefined
  /** Canonical path of the deleted entry write-up. */
  path: string
}

/** Versioned journal persisted in a repository. */
export type State = {
  /** Deleted mirrors available for restoration. */
  mirrors: readonly Mirror[]
  /** Journal format version. */
  version: 1
}

/** An empty recovery journal. */
export function empty(): State {
  return { mirrors: [], version: 1 }
}

function key(mirror: Mirror): string {
  return `${mirror.issue}\u0000${mirror.path}`
}

function valid(mirror: unknown): mirror is Mirror {
  if (!mirror || typeof mirror !== 'object' || Array.isArray(mirror)) return false
  const value = mirror as Partial<Mirror>
  if (typeof value.issue !== 'string' || !Github.parseLink(value.issue)) return false
  if (typeof value.path !== 'string') return false
  const id = Store.toId(value.path)
  if (!id || Store.toPath(id) !== value.path) return false

  const snapshot = value.occurrence !== undefined || value.contents !== undefined
  if (!snapshot) return true
  if (
    typeof value.occurrence !== 'string' ||
    !/^[0-9a-f]{64}$/.test(value.occurrence) ||
    typeof value.contents !== 'string'
  )
    return false

  const entry = parse(value.contents, { id })
  return Boolean(entry && entry.issue === value.issue && Entry.serialize(entry) === value.contents)
}

function normalize(mirrors: readonly Mirror[]): readonly Mirror[] {
  return [...new Map(mirrors.map((mirror) => [key(mirror), mirror])).values()]
    .map((mirror) => ({
      ...(mirror.contents === undefined ? {} : { contents: mirror.contents }),
      issue: mirror.issue,
      ...(mirror.occurrence === undefined ? {} : { occurrence: mirror.occurrence }),
      path: mirror.path,
    }))
    .sort((a, b) => key(a).localeCompare(key(b)))
}

/**
 * Validates and normalizes a loaded journal.
 *
 * Unknown versions fail closed, so older code never silently discards recovery state.
 */
export function from(value: unknown): State {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new InvalidError('Expected an object.')

  const state = value as { mirrors?: unknown; version?: unknown }
  if (state.version !== 1) throw new InvalidError('Expected version 1.')
  if (!Array.isArray(state.mirrors) || !state.mirrors.every(valid))
    throw new InvalidError('Expected canonical issue and entry path pairs.')

  return { mirrors: normalize(state.mirrors), version: 1 }
}

/** Deterministic on-disk representation. */
export function serialize(state: State): string {
  const validated = from({ mirrors: state.mirrors, version: 1 })
  return `${JSON.stringify(validated, null, 2)}\n`
}

/**
 * Recovers the repository-owned entry captured by a snapshot mirror.
 *
 * Legacy mirrors have no contents and resolve to `undefined`.
 */
export function toEntry(mirror: Mirror): Entry.Entry | undefined {
  if (
    mirror.contents === undefined ||
    mirror.occurrence === undefined ||
    !/^[0-9a-f]{64}$/.test(mirror.occurrence)
  )
    return undefined

  const id = Store.toId(mirror.path)
  if (!id) return undefined
  const entry = parse(mirror.contents, { id })
  if (!entry || entry.issue !== mirror.issue || Entry.serialize(entry) !== mirror.contents)
    return undefined
  return entry
}

function parse(contents: string, options: Entry.parse.Options): Entry.Entry | undefined {
  try {
    return Entry.parse(contents, options)
  } catch {
    return undefined
  }
}

/** Adds and removes exact mirror records. */
export function update(
  state: State,
  options: {
    forget?: readonly Mirror[] | undefined
    remember?: readonly Mirror[] | undefined
  },
): State {
  const mirrors = new Map(state.mirrors.map((mirror) => [key(mirror), mirror]))
  for (const mirror of options.forget ?? []) mirrors.delete(key(mirror))
  for (const mirror of options.remember ?? []) mirrors.set(key(mirror), mirror)
  return { mirrors: normalize([...mirrors.values()]), version: 1 }
}

/** Reads the local journal. A missing file is an empty journal. */
export async function resolve(options: Store.Options): Promise<State> {
  const contents = await fs
    .readFile(path.join(options.root, file), 'utf8')
    .catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return undefined
      throw error
    })
  if (contents === undefined) return empty()

  try {
    return from(JSON.parse(contents))
  } catch (error) {
    if (error instanceof InvalidError) throw error
    throw new MalformedError(error as Error)
  }
}

/** Writes the local journal, or removes it when no mirrors remain. */
export async function write(state: State, options: Store.Options): Promise<void> {
  const target = path.join(options.root, file)
  if (state.mirrors.length === 0) {
    await fs.rm(target, { force: true })
    return
  }

  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(target, serialize(state), 'utf8')
}

/** Thrown when the journal is valid JSON but not a supported recovery state. */
export class InvalidError extends Error {
  /** Stable error name. */
  override name = 'Mirrors.InvalidError'
  /** Machine-readable error code. */
  code = 'INVALID_SYNC_STATE' as const

  constructor(detail: string) {
    super(`\`${file}\` is invalid. ${detail}`)
  }
}

/** Thrown when the journal is not parseable JSON. */
export class MalformedError extends Error {
  /** Stable error name. */
  override name = 'Mirrors.MalformedError'
  /** Machine-readable error code. */
  code = 'MALFORMED_SYNC_STATE' as const

  constructor(cause: Error) {
    super(`\`${file}\` is not valid JSON.`, { cause })
  }
}
