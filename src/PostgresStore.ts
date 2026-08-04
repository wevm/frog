import { randomUUID } from 'node:crypto'
import * as Entry from './Entry.js'
import type * as FrictionLog from './FrictionLog.js'

/** Minimal structural client implemented by `pg` pools and transaction clients. */
export type Client = {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<{
    /** Number of affected rows when the driver supplies it. */
    rowCount?: number | null | undefined
    /** Query result rows. */
    rows: T[]
  }>
}

/** Postgres schema lifecycle configuration. */
export type MigrationOptions = {
  /** Pool or transaction client used for every query. */
  client: Client
  /** Optional PostgreSQL schema. Omit it to use the client's current search path. */
  schema?: string | undefined
}

/** Postgres adapter configuration. */
export type Options = MigrationOptions & {
  /** Isolates independent consumers sharing one table. */
  namespace: string
}

type Row = {
  contents: string
  created?: boolean | undefined
  id: string
  occurrence_count: number | string
}

/** Creates the tables required by the Postgres adapter. Safe to call repeatedly. */
export async function migrate(options: MigrationOptions): Promise<void> {
  const schema = options.schema === undefined ? undefined : schemaName(options.schema)
  const table = tableName(schema)
  if (schema !== undefined) await options.client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`)
  await options.client.query(
    `CREATE TABLE IF NOT EXISTS ${table} (
       namespace text NOT NULL,
       id text NOT NULL,
       dedupe_key text NOT NULL,
       contents text NOT NULL,
       occurrence_count integer NOT NULL DEFAULT 1 CHECK (occurrence_count > 0),
       created_at timestamptz NOT NULL DEFAULT now(),
       updated_at timestamptz NOT NULL DEFAULT now(),
       PRIMARY KEY (namespace, id),
       UNIQUE (namespace, dedupe_key)
     )`,
  )
}

/** Postgres-backed Frog store. Schema creation is explicit through {@link migrate}. */
export function adapter(options: Options): FrictionLog.Adapter {
  const namespace = required(options.namespace, 'namespace')
  const table = tableName(options.schema)
  const client = options.client

  const get = async (id: string): Promise<Entry.Entry> => {
    const result = await client.query<Row>(
      `SELECT id, contents, occurrence_count FROM ${table} WHERE namespace = $1 AND id = $2`,
      [namespace, id],
    )
    const row = result.rows[0]
    if (!row) throw new NotFoundError(id)
    return Entry.parse(row.contents, { id: row.id })
  }

  const store: FrictionLog.Adapter = {
    name: 'postgres',
    migrate: () => migrate(options),
    async read() {
      const result = await client.query<Row>(
        `SELECT id, contents, occurrence_count FROM ${table} WHERE namespace = $1 ORDER BY id`,
        [namespace],
      )
      return result.rows.map((row) => Entry.parse(row.contents, { id: row.id }))
    },
    async list() {
      const result = await client.query<{ id: string }>(
        `SELECT id FROM ${table} WHERE namespace = $1 ORDER BY id`,
        [namespace],
      )
      return result.rows.map((row) => row.id)
    },
    async records() {
      const result = await client.query<Row>(
        `SELECT id, contents, occurrence_count FROM ${table} WHERE namespace = $1 ORDER BY id`,
        [namespace],
      )
      return result.rows.map((row) => ({
        entry: Entry.parse(row.contents, { id: row.id }),
        occurrences: Number(row.occurrence_count),
      }))
    },
    get,
    async write(entry, writeOptions = {}) {
      const id = writeOptions.id ?? newId(entry.title)
      const contents = Entry.serialize(entry)
      const dedupeKey = `entry:${id}`
      const titleKey = `title:${Entry.normalizeTitle(entry.title)}`
      await client.query(
        `INSERT INTO ${table}(namespace, id, dedupe_key, contents)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT(namespace, id) DO UPDATE SET
           dedupe_key = CASE
             WHEN ${table}.dedupe_key LIKE 'title:%' THEN $5
             ELSE ${table}.dedupe_key
           END,
           contents = EXCLUDED.contents,
           updated_at = now()`,
        [namespace, id, dedupeKey, contents, titleKey],
      )
      return { id, location: location(namespace, id) }
    },
    async remove(id) {
      const result = await client.query(`DELETE FROM ${table} WHERE namespace = $1 AND id = $2`, [
        namespace,
        id,
      ])
      return (result.rowCount ?? 0) > 0
    },
    async files() {
      return []
    },
    async record(entry, recordOptions = {}) {
      const id = newId(entry.title)
      const dedupeKey = recordOptions.force
        ? `forced:${id}`
        : `title:${Entry.normalizeTitle(entry.title)}`
      const result = await client.query<Row>(
        `INSERT INTO ${table}(namespace, id, dedupe_key, contents)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT(namespace, dedupe_key) DO UPDATE SET
           occurrence_count = ${table}.occurrence_count + 1,
           updated_at = now()
         RETURNING id, contents, occurrence_count, (occurrence_count = 1) AS created`,
        [namespace, id, dedupeKey, Entry.serialize(entry)],
      )
      const row = result.rows[0]
      if (!row) throw new Error('Postgres did not return the recorded friction entry.')
      return {
        created: row.created === true,
        entry: Entry.parse(row.contents, { id: row.id }),
        occurrences: Number(row.occurrence_count),
      }
    },
  }
  return store
}

function newId(title: string): string {
  return `${Entry.newId({ title })}-${randomUUID().slice(0, 8)}`
}

function schemaName(schema: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(schema))
    throw new Error('Postgres schema must be a SQL identifier.')
  return schema
}

function tableName(schema?: string): string {
  return schema === undefined ? '"frog_entries"' : `"${schemaName(schema)}"."frog_entries"`
}

function required(value: string, name: string): string {
  const normalized = value.trim()
  if (!normalized) throw new Error(`Postgres ${name} is required.`)
  return normalized
}

function location(namespace: string, id: string): string {
  return `postgres:${encodeURIComponent(namespace)}/${encodeURIComponent(id)}`
}

/** Raised when a requested Postgres-backed entry does not exist. */
export class NotFoundError extends Error {
  /** Namespaced class name. */
  override name = 'PostgresStore.NotFoundError'
  /** Machine-readable error code. */
  code = 'ENTRY_NOT_FOUND' as const

  constructor(id: string) {
    super(`Friction entry \`${id}\` does not exist.`)
  }
}
