import fs from 'node:fs/promises'
import path from 'node:path'
import * as Github from './Github.js'
import * as Store from './Store.js'

/** Repository-relative path of the committed mirror recovery journal. */
export const file = `${Store.dir}/.sync.json`

/** A deleted local mirror that can be restored if its issue reopens. */
export type Mirror = {
  /** Issue the entry mirrored, as `owner/name#number`. */
  issue: string
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
  return Boolean(id && Store.toPath(id) === value.path)
}

function normalize(mirrors: readonly Mirror[]): readonly Mirror[] {
  return [...new Map(mirrors.map((mirror) => [key(mirror), mirror])).values()].sort((a, b) =>
    key(a).localeCompare(key(b)),
  )
}

/**
 * Validates and normalizes a loaded journal.
 *
 * Unknown versions fail closed so recovery state is never silently discarded by older code.
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
  return `${JSON.stringify({ version: 1, mirrors: normalize(state.mirrors) }, null, 2)}\n`
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
