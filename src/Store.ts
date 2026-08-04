import fs from 'node:fs/promises'
import { AsyncLocalStorage } from 'node:async_hooks'
import path from 'node:path'
import * as Entry from './Entry.js'

const activeAdapter = new AsyncLocalStorage<Adapter | undefined>()

/** Directory holding entries, relative to the repository root. */
export const dir = '.agents/friction-log'

/** Name of the entry file inside an entry's directory. */
export const filename = 'friction.md'

/** Name of the directory holding an entry's reproduction files. */
export const artifacts = 'artifacts'

/** Options shared by every store operation. */
export type Options = {
  /** Repository root. Entries live in `<root>/.agents/friction-log`. */
  root: string
}

/** Options for an adapter write. */
export type AdapterWriteOptions = {
  /** Existing entry id to replace. */
  id?: string | undefined
}

/** Result of writing through a storage adapter. */
export type AdapterWriteResult = {
  /** Stable entry id. */
  id: string
  /** Adapter-defined location suitable for diagnostics. */
  location: string
}

/** One canonical entry and optional storage metadata. */
export type StoredEntry = {
  /** Canonical entry payload shared by every store. */
  entry: Entry.Entry
  /** Number of observations when the adapter tracks recurrence. */
  occurrences: number
}

/** Storage operations consumed by Frog's programmatic API. */
export type Adapter = {
  /** Stable adapter name for diagnostics. */
  readonly name: string
  /** Prepares adapter-owned storage, when required. Safe to call repeatedly. */
  migrate?(): Promise<void>
  /** Lists every entry in stable id order. */
  read(): Promise<readonly Entry.Entry[]>
  /** Lists entries with recurrence metadata, when tracked by the adapter. */
  records?(): Promise<readonly StoredEntry[]>
  /** Lists entry ids in stable order. */
  list(): Promise<readonly string[]>
  /** Reads one entry. */
  get(id: string): Promise<Entry.Entry>
  /** Writes an entry, optionally replacing a known id. Every canonical entry field must round trip. */
  write(entry: Entry.serialize.Options, options?: AdapterWriteOptions): Promise<AdapterWriteResult>
  /** Removes an entry and reports whether it existed. */
  remove(id: string): Promise<boolean>
  /** Lists adapter-owned artifact locations, when the adapter supports artifacts. */
  files?(id: string): Promise<readonly string[]>
}

/** Runs store operations in one async scope through the supplied adapter. */
export function withAdapter<T>(store: Adapter, operation: () => Promise<T>): Promise<T> {
  return activeAdapter.run(store, operation)
}

/** Name of the adapter selected for this async scope. Defaults to the repository file store. */
export function activeName(): string {
  return activeAdapter.getStore()?.name ?? 'file'
}

/** Migrates the active adapter, returning whether it owns a migration. The file store needs none. */
export async function migrate(): Promise<boolean> {
  const store = activeAdapter.getStore()
  if (!store?.migrate) return false
  await store.migrate()
  return true
}

/** Binds the existing repository-file store to one root. */
export function adapter(options: Options): Adapter {
  return {
    name: 'file',
    read: () => activeAdapter.run(undefined, () => read(options)),
    list: () => activeAdapter.run(undefined, () => list(options)),
    get: (id) => activeAdapter.run(undefined, () => get(id, options)),
    write: async (entry, writeOptions = {}) => {
      const written = await activeAdapter.run(undefined, () =>
        write(entry, { ...writeOptions, root: options.root }),
      )
      return { id: written.id, location: written.file }
    },
    remove: (id) => activeAdapter.run(undefined, () => remove(id, options)),
    files: (id) => activeAdapter.run(undefined, () => files(id, options)),
  }
}

/**
 * Directory holding an entry and anything needed to reproduce it.
 *
 * An entry is a directory rather than a single file so a reproduction can ship beside it: the write-up
 * in `friction.md`, the script or fixture that triggers it under `artifacts/`.
 *
 * @param id - Entry id.
 * @returns The repository-relative directory.
 */
export function toDir(id: string): string {
  return `${dir}/${id}`
}

/**
 * Path of an entry's write-up, relative to the repository root.
 *
 * @param id - Entry id.
 */
export function toPath(id: string): string {
  return `${toDir(id)}/${filename}`
}

/**
 * Path of an entry's artifacts directory, relative to the repository root.
 *
 * @param id - Entry id.
 */
export function toArtifacts(id: string): string {
  return `${toDir(id)}/${artifacts}`
}

/**
 * Id of the entry a repository-relative path refers to.
 *
 * The inverse of {@link toPath}. Only the write-up identifies an entry, so an artifact path resolves
 * to nothing.
 *
 * @param file - Repository-relative path.
 * @returns The id, or `undefined` when the path is not an entry's write-up.
 */
export function toId(file: string): string | undefined {
  if (!file.startsWith(`${dir}/`) || !file.endsWith(`/${filename}`)) return undefined

  const id = file.slice(dir.length + 1, -(filename.length + 1))
  if (!id || id.includes('/') || id.startsWith('.')) return undefined
  return id
}

/**
 * Reads and parses every entry, sorted by id.
 *
 * @returns Every entry. Throws on the first malformed write-up rather than skipping it.
 */
export async function read(options: Options): Promise<readonly Entry.Entry[]> {
  const selected = activeAdapter.getStore()
  if (selected) return selected.read()
  const ids = await list(options)
  return Promise.all(ids.map((id) => get(id, options)))
}

/** Lists canonical entries with recurrence metadata when the active adapter tracks it. */
export async function records(options: Options): Promise<readonly StoredEntry[]> {
  const selected = activeAdapter.getStore()
  if (selected?.records) return selected.records()
  return (await read(options)).map((entry) => ({ entry, occurrences: 1 }))
}

/**
 * Lists the ids of every entry, sorted.
 *
 * A directory counts as an entry only once it holds a write-up. A stray directory is ignored.
 *
 * @returns Entry ids. A missing directory yields an empty list.
 */
export async function list(options: Options): Promise<readonly string[]> {
  const selected = activeAdapter.getStore()
  if (selected) return selected.list()
  const found = await fs
    .readdir(path.join(options.root, dir), { withFileTypes: true })
    .catch((error) => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
      throw error
    })

  const ids = found
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort()

  const present = await Promise.all(
    ids.map((id) =>
      fs
        .access(path.join(options.root, toPath(id)))
        .then(() => true)
        .catch(() => false),
    ),
  )
  return ids.filter((_, index) => present[index])
}

/**
 * Reads and parses one entry.
 *
 * @param id - Entry id.
 */
export async function get(id: string, options: Options): Promise<Entry.Entry> {
  const selected = activeAdapter.getStore()
  if (selected) return selected.get(id)
  const contents = await fs.readFile(path.join(options.root, toPath(id)), 'utf8')
  return Entry.parse(contents, { id })
}

/**
 * Lists every repository-relative path belonging to an entry, write-up and artifacts alike.
 *
 * Needed to stage a deletion: removing an entry means removing its reproduction too.
 *
 * @param id - Entry id.
 * @returns Paths, sorted. Empty when the entry does not exist.
 */
export async function files(id: string, options: Options): Promise<readonly string[]> {
  const selected = activeAdapter.getStore()
  if (selected) return selected.files?.(id) ?? []
  const base = path.join(options.root, toDir(id))
  const found = await fs
    .readdir(base, { recursive: true, withFileTypes: true })
    .catch(() => [] as Awaited<ReturnType<typeof fs.readdir>> as never[])

  return found
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const nested = path.relative(base, path.join(entry.parentPath, entry.name))
      return `${toDir(id)}/${nested.split(path.sep).join('/')}`
    })
    .sort()
}

/**
 * Writes an entry, minting an id when one is not supplied.
 *
 * Passing an existing id overwrites the write-up in place, leaving any artifacts alone. The issue link
 * is written back that way after filing.
 *
 * @returns The id used and the path written.
 */
export async function write(
  entry: Entry.serialize.Options,
  options: write.Options,
): Promise<write.ReturnType> {
  const selected = activeAdapter.getStore()
  if (selected) {
    const written = await selected.write(entry, options.id ? { id: options.id } : {})
    return { file: written.location, id: written.id }
  }
  const id = options.id ?? (await claim(entry.title, options))
  const file = toPath(id)
  await fs.mkdir(path.join(options.root, toDir(id)), { recursive: true })
  await fs.writeFile(path.join(options.root, file), Entry.serialize(entry), 'utf8')
  return { file, id }
}

/**
 * Reserves a directory for a new entry, returning the id it got.
 *
 * Ids come from the title and the timestamp, so two entries logged in the same second about the same
 * thing want the same id. Creating the directory is the claim: each pass either claims the id or proves that
 * suffix is taken, and only finitely many can be.
 */
async function claim(title: string, options: Options): Promise<string> {
  const base = Entry.newId({ title })
  await fs.mkdir(path.join(options.root, dir), { recursive: true })

  for (let attempt = 1; ; attempt++) {
    const id = attempt === 1 ? base : `${base}-${attempt}`
    try {
      await fs.mkdir(path.join(options.root, toDir(id)))
      return id
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    }
  }
}

export declare namespace write {
  /** Options for {@link write}. */
  type Options = {
    /** Reuse an existing id, overwriting that entry, instead of minting a new one. */
    id?: string | undefined
    /** Repository root. Entries live in `<root>/.agents/friction-log`. */
    root: string
  }
  /** Result of {@link write}. */
  type ReturnType = {
    /** Path of the write-up, relative to the repository root. */
    file: string
    /** Id used, whether supplied or minted. */
    id: string
  }
}

/**
 * Deletes an entry and everything in it.
 *
 * @param id - Entry id.
 * @returns `true` when a directory was deleted, `false` when it was already gone. Being already gone is
 * not an error, so reconciliation stays safe to re-run.
 */
export async function remove(id: string, options: Options): Promise<boolean> {
  const selected = activeAdapter.getStore()
  if (selected) return selected.remove(id)
  const base = path.join(options.root, toDir(id))
  try {
    await fs.stat(base)
  } catch {
    return false
  }
  await fs.rm(base, { force: true, recursive: true })
  return true
}
