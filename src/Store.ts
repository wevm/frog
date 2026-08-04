import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import postgresjs from 'postgres'
import * as Entry from './Entry.js'

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

/** Options for writing through a store. */
export type WriteOptions = {
  /** Existing entry id to replace. */
  id?: string | undefined
}

/** Result of writing through a store. */
export type WriteResult = {
  /** Stable entry id. */
  id: string
  /** Store-defined location suitable for diagnostics. */
  location: string
}

/** One canonical entry and optional storage metadata. */
export type StoredEntry = {
  /** Canonical entry payload shared by every store. */
  entry: Entry.Entry
  /** Number of observations when the store tracks recurrence. */
  occurrences: number
}

/** Result of logging one friction occurrence. */
export type LogResult = StoredEntry & {
  /** Whether this call created a new entry. */
  created: boolean
  /** Store-defined location suitable for diagnostics. */
  location: string
}

/** Storage operations consumed by Frog. */
export type Store = {
  /** Stable store name for diagnostics and capability checks. */
  readonly name: string
  /** Repository root when the store is bound to local files. */
  readonly root?: string | undefined
  /** Whether the store preserves occurrence counts beyond the canonical entry. */
  readonly tracksOccurrences: boolean
  /** Prepares store-owned storage. Safe to call repeatedly. */
  readonly migrate: () => Promise<void>
  /** Releases store-owned resources. Safe to call repeatedly. */
  readonly close: () => Promise<void>
  /** Lists every entry in stable id order. */
  readonly read: () => Promise<readonly Entry.Entry[]>
  /** Lists entries with recurrence metadata. */
  readonly records: () => Promise<readonly StoredEntry[]>
  /** Lists entry ids in stable order. */
  readonly list: () => Promise<readonly string[]>
  /** Reads one entry. */
  readonly get: (id: string) => Promise<Entry.Entry>
  /** Writes an entry, optionally replacing a known id. Every canonical entry field must round trip. */
  readonly write: (entry: Entry.serialize.Options, options?: WriteOptions) => Promise<WriteResult>
  /** Removes an entry and reports whether it existed. */
  readonly remove: (id: string) => Promise<boolean>
  /** Lists store-owned artifact locations. */
  readonly files: (id: string) => Promise<readonly string[]>
  /** Returns the store-defined location for one entry. */
  readonly location: (id: string) => string
  /** Atomically logs and deduplicates an occurrence when the store supports it. */
  readonly log?:
    | ((entry: Entry.serialize.Options, options?: LogOptions) => Promise<LogResult>)
    | undefined
}

/** Options for logging one friction occurrence. */
export type LogOptions = {
  /** Preserve an intentional duplicate instead of deduplicating it. */
  force?: boolean | undefined
}

/** Normalizes a custom store by supplying safe defaults for optional capabilities. */
export function from(value: from.Value): Store {
  return {
    name: value.name,
    ...(value.root !== undefined ? { root: value.root } : {}),
    tracksOccurrences: value.tracksOccurrences ?? value.records !== undefined,
    migrate: value.migrate ?? (async () => {}),
    close: value.close ?? (async () => {}),
    read: value.read,
    records:
      value.records ??
      (async () => (await value.read()).map((entry) => ({ entry, occurrences: 1 }))),
    list: value.list ?? (async () => (await value.read()).map((entry) => entry.id).sort()),
    get: value.get,
    write: value.write,
    remove: value.remove,
    files: value.files ?? (async () => []),
    location: value.location ?? ((id) => id),
    ...(value.log ? { log: value.log } : {}),
  }
}

export declare namespace from {
  /** Minimum operations required to adapt a store to Frog. */
  type Value = {
    /** Stable store name for diagnostics and capability checks. */
    readonly name: string
    /** Repository root when the store is bound to local files. */
    readonly root?: string | undefined
    /** Whether the store preserves occurrence counts beyond the canonical entry. */
    readonly tracksOccurrences?: boolean | undefined
    /** Lists every entry in stable id order. */
    readonly read: () => Promise<readonly Entry.Entry[]>
    /** Reads one entry. */
    readonly get: (id: string) => Promise<Entry.Entry>
    /** Writes an entry, optionally replacing a known id. */
    readonly write: (entry: Entry.serialize.Options, options?: WriteOptions) => Promise<WriteResult>
    /** Removes an entry and reports whether it existed. */
    readonly remove: (id: string) => Promise<boolean>
    /** Prepares store-owned storage. Safe to call repeatedly. */
    readonly migrate?: (() => Promise<void>) | undefined
    /** Releases store-owned resources. Safe to call repeatedly. */
    readonly close?: (() => Promise<void>) | undefined
    /** Lists entries with recurrence metadata. Derived from `read` by default. */
    readonly records?: (() => Promise<readonly StoredEntry[]>) | undefined
    /** Lists entry ids in stable order. Derived from `read` by default. */
    readonly list?: (() => Promise<readonly string[]>) | undefined
    /** Lists store-owned artifact locations. Empty by default. */
    readonly files?: ((id: string) => Promise<readonly string[]>) | undefined
    /** Returns the store-defined location for one entry. Defaults to its id. */
    readonly location?: ((id: string) => string) | undefined
    /** Atomically logs and deduplicates an occurrence when the store supports it. */
    readonly log?:
      | ((entry: Entry.serialize.Options, options?: LogOptions) => Promise<LogResult>)
      | undefined
  }
}

/** Binds the repository-file store to one root. */
export function file(options: file.Options): Store {
  const root = path.resolve(options.root)
  return from({
    name: 'file',
    root,
    read: () => read({ root }),
    list: () => list({ root }),
    get: (id) => get(id, { root }),
    write: async (entry, writeOptions = {}) => {
      const written = await write(entry, { ...writeOptions, root })
      return { id: written.id, location: written.file }
    },
    remove: (id) => remove(id, { root }),
    files: (id) => files(id, { root }),
    location: toPath,
  })
}

export declare namespace file {
  /** Options for {@link file}. */
  type Options = {
    /** Repository root. Entries live in `<root>/.agents/friction-log`. */
    root: string
  }
}

/** Whether a value is a safe, visible entry-directory name. */
export function isId(id: string): boolean {
  return (
    id.length > 0 &&
    !id.startsWith('.') &&
    !/[. ]$/.test(id) &&
    !id.includes('/') &&
    !id.includes('\\') &&
    !id.includes('\0')
  )
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
  if (!isId(id)) throw invalidIdError(id)
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
  if (!isId(id)) return undefined
  return id
}

/**
 * Reads and parses every entry, sorted by id.
 *
 * @returns Every entry. Throws on the first malformed write-up rather than skipping it.
 */
export async function read(options: Options): Promise<readonly Entry.Entry[]> {
  const ids = await list(options)
  return Promise.all(ids.map((id) => get(id, options)))
}

/** Lists file-store entries with their single-observation metadata. */
export async function records(options: Options): Promise<readonly StoredEntry[]> {
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
  const found = await fs
    .readdir(path.join(options.root, dir), { withFileTypes: true })
    .catch((error) => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
      throw error
    })

  const ids = found
    .filter((entry) => entry.isDirectory() && isId(entry.name))
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
  const base = path.join(options.root, toDir(id))
  try {
    await fs.stat(base)
  } catch {
    return false
  }
  await fs.rm(base, { force: true, recursive: true })
  return true
}

type PostgresRow = {
  contents: string
  created?: boolean | undefined
  id: string
  occurrence_count: number | string
}

/** Creates a Postgres-backed store from a connection string. */
export function postgres(options: postgres.Options): Store {
  const connectionString = required(options.connectionString, 'connectionString')
  const namespace = required(options.namespace ?? 'default', 'namespace')
  const sql = postgresjs(connectionString)
  const schema = options.schema === undefined ? undefined : schemaName(options.schema)
  const table =
    schema === undefined ? sql('frog_entries') : sql`${sql(schema)}.${sql('frog_entries')}`
  let closing: Promise<void> | undefined

  const get = async (id: string): Promise<Entry.Entry> => {
    const result = await sql<PostgresRow[]>`
      SELECT id, contents, occurrence_count
      FROM ${table}
      WHERE namespace = ${namespace} AND id = ${id}
    `
    const row = result[0]
    if (!row) throw notFoundError(id)
    return Entry.parse(row.contents, { id: row.id })
  }

  return from({
    name: 'postgres',
    tracksOccurrences: true,
    location: (id) => postgresLocation(namespace, id),
    close: () => (closing ??= sql.end()),
    async migrate() {
      if (schema !== undefined) await sql`CREATE SCHEMA IF NOT EXISTS ${sql(schema)}`
      await sql`
        CREATE TABLE IF NOT EXISTS ${table} (
          namespace text NOT NULL,
          id text NOT NULL,
          dedupe_key text NOT NULL,
          contents text NOT NULL,
          occurrence_count integer NOT NULL DEFAULT 1 CHECK (occurrence_count > 0),
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (namespace, id),
          UNIQUE (namespace, dedupe_key)
        )
      `
    },
    async read() {
      const result = await sql<PostgresRow[]>`
        SELECT id, contents, occurrence_count
        FROM ${table}
        WHERE namespace = ${namespace}
        ORDER BY id
      `
      return result.map((row) => Entry.parse(row.contents, { id: row.id }))
    },
    async records() {
      const result = await sql<PostgresRow[]>`
        SELECT id, contents, occurrence_count
        FROM ${table}
        WHERE namespace = ${namespace}
        ORDER BY id
      `
      return result.map((row) => ({
        entry: Entry.parse(row.contents, { id: row.id }),
        occurrences: Number(row.occurrence_count),
      }))
    },
    async list() {
      const result = await sql<{ id: string }[]>`
        SELECT id FROM ${table} WHERE namespace = ${namespace} ORDER BY id
      `
      return result.map((row) => row.id)
    },
    get,
    async write(entry, writeOptions = {}) {
      const id = writeOptions.id ?? newPostgresId(entry.title)
      const dedupeKey = `entry:${id}`
      const titleKey = `title:${Entry.normalizeTitle(entry.title)}`
      await sql`
        INSERT INTO ${table}(namespace, id, dedupe_key, contents)
        VALUES (${namespace}, ${id}, ${dedupeKey}, ${Entry.serialize(entry)})
        ON CONFLICT(namespace, id) DO UPDATE SET
          dedupe_key = CASE
            WHEN ${table}.dedupe_key LIKE 'title:%' THEN ${titleKey}
            ELSE ${table}.dedupe_key
          END,
          contents = EXCLUDED.contents,
          updated_at = now()
      `
      return { id, location: postgresLocation(namespace, id) }
    },
    async remove(id) {
      const result = await sql<{ id: string }[]>`
        DELETE FROM ${table} WHERE namespace = ${namespace} AND id = ${id} RETURNING id
      `
      return result.length > 0
    },
    async log(entry, logOptions = {}) {
      const id = newPostgresId(entry.title)
      const dedupeKey = logOptions.force
        ? `forced:${id}`
        : `title:${Entry.normalizeTitle(entry.title)}`
      const result = await sql<PostgresRow[]>`
        INSERT INTO ${table}(namespace, id, dedupe_key, contents)
        VALUES (${namespace}, ${id}, ${dedupeKey}, ${Entry.serialize(entry)})
        ON CONFLICT(namespace, dedupe_key) DO UPDATE SET
          occurrence_count = ${table}.occurrence_count + 1,
          updated_at = now()
        RETURNING id, contents, occurrence_count, (occurrence_count = 1) AS created
      `
      const row = result[0]
      if (!row) throw new Error('Postgres did not return the logged friction entry.')
      return {
        created: row.created === true,
        entry: Entry.parse(row.contents, { id: row.id }),
        location: postgresLocation(namespace, row.id),
        occurrences: Number(row.occurrence_count),
      }
    },
  })
}

export declare namespace postgres {
  /** Postgres store configuration. */
  type Options = {
    /** PostgreSQL connection URL. */
    connectionString: string
    /** Isolates independent consumers sharing one table. Defaults to `default`. */
    namespace?: string | undefined
    /** Optional PostgreSQL schema. Omit it to use the default search path. */
    schema?: string | undefined
  }
}

function newPostgresId(title: string): string {
  return `${Entry.newId({ title })}-${randomUUID().slice(0, 8)}`
}

function schemaName(schema: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(schema))
    throw new Error('Postgres schema must be a SQL identifier.')
  return schema
}

function required(value: string, name: string): string {
  const normalized = value.trim()
  if (!normalized) throw new Error(`Postgres ${name} is required.`)
  return normalized
}

function postgresLocation(namespace: string, id: string): string {
  return `postgres:${encodeURIComponent(namespace)}/${encodeURIComponent(id)}`
}

function notFoundError(id: string): Error & { code: 'ENTRY_NOT_FOUND' } {
  const error = Object.assign(new Error(`Friction entry \`${id}\` does not exist.`), {
    code: 'ENTRY_NOT_FOUND' as const,
  })
  error.name = 'Store.NotFoundError'
  return error
}

function invalidIdError(id: string): Error & { code: 'INVALID_ENTRY_ID' } {
  const error = Object.assign(new Error(`Friction entry id \`${id}\` is not path-safe.`), {
    code: 'INVALID_ENTRY_ID' as const,
  })
  error.name = 'Store.InvalidIdError'
  return error
}
