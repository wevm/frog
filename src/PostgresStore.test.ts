import * as Entry from './Entry.js'
import { FrictionLog } from './FrictionLog.js'
import * as PostgresStore from './PostgresStore.js'

type Stored = { contents: string; dedupeKey: string; id: string; occurrences: number }

class FakeClient implements PostgresStore.Client {
  readonly queries: string[] = []
  readonly rows = new Map<string, Stored>()

  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<{ rowCount: number; rows: T[] }> {
    this.queries.push(text)
    if (text.startsWith('CREATE ')) return { rowCount: 0, rows: [] }

    const namespace = String(values[0])
    const key = (id: string) => `${namespace}\u0000${id}`
    if (text.includes('ON CONFLICT(namespace, dedupe_key)')) {
      const [, rawId, rawDedupe, rawContents] = values
      const id = String(rawId)
      const dedupeKey = String(rawDedupe)
      const existing = [...this.rows.entries()].find(
        ([storedKey, row]) =>
          storedKey.startsWith(`${namespace}\u0000`) && row.dedupeKey === dedupeKey,
      )?.[1]
      if (existing) {
        existing.occurrences += 1
        return {
          rowCount: 1,
          rows: [
            {
              contents: existing.contents,
              created: false,
              id: existing.id,
              occurrence_count: existing.occurrences,
            } as unknown as T,
          ],
        }
      }
      const stored = { contents: String(rawContents), dedupeKey, id, occurrences: 1 }
      this.rows.set(key(id), stored)
      return {
        rowCount: 1,
        rows: [
          { contents: stored.contents, created: true, id, occurrence_count: 1 } as unknown as T,
        ],
      }
    }
    if (text.startsWith('INSERT INTO')) {
      const [, rawId, rawDedupe, rawContents] = values
      const id = String(rawId)
      const previous = this.rows.get(key(id))
      this.rows.set(key(id), {
        contents: String(rawContents),
        dedupeKey: String(rawDedupe),
        id,
        occurrences: previous?.occurrences ?? 1,
      })
      return { rowCount: 1, rows: [] }
    }
    if (text.startsWith('SELECT id, contents')) {
      const selected =
        typeof values[1] === 'string'
          ? [this.rows.get(key(values[1]))].filter(Boolean)
          : [...this.rows.entries()]
              .filter(([storedKey]) => storedKey.startsWith(`${namespace}\u0000`))
              .map(([, row]) => row)
      return {
        rowCount: selected.length,
        rows: selected.map(
          (row) =>
            ({
              contents: row!.contents,
              id: row!.id,
              occurrence_count: row!.occurrences,
            }) as unknown as T,
        ),
      }
    }
    if (text.startsWith('SELECT id FROM')) {
      const selected = [...this.rows.entries()].filter(([storedKey]) =>
        storedKey.startsWith(`${namespace}\u0000`),
      )
      return {
        rowCount: selected.length,
        rows: selected.map(([, row]) => ({ id: row.id }) as unknown as T),
      }
    }
    if (text.startsWith('DELETE FROM')) {
      const removed = this.rows.delete(key(String(values[1])))
      return { rowCount: removed ? 1 : 0, rows: [] }
    }
    throw new Error(`Unhandled SQL: ${text}`)
  }
}

const friction = {
  body: 'The tool required an unnecessary workaround.',
  context: { source: 'production-agent', trace: 'opaque-reference' },
  severity: 'major',
  title: 'Tool result omitted its state',
} as const

describe('PostgresStore', () => {
  test('behavior: migration is explicit, namespaced, and idempotent SQL', async () => {
    const client = new FakeClient()
    await PostgresStore.migrate({ client, namespace: 'unused', schema: 'frog' })
    expect(client.queries).toHaveLength(2)
    expect(client.queries[0]).toBe('CREATE SCHEMA IF NOT EXISTS "frog"')
    expect(client.queries[1]).toContain('CREATE TABLE IF NOT EXISTS "frog"."frog_entries"')
    expect(client.queries[1]).toContain('UNIQUE (namespace, dedupe_key)')
  })

  test('behavior: records, deduplicates, updates, lists, and removes through the public API', async () => {
    const client = new FakeClient()
    const log = new FrictionLog({
      store: PostgresStore.adapter({ client, namespace: 'consumer-a' }),
    })

    const first = await log.record(friction)
    const repeated = await log.record({ ...friction, body: 'A later occurrence.' })
    expect(first).toMatchObject({ created: true, occurrences: 1 })
    expect(repeated).toMatchObject({ created: false, occurrences: 2, entry: first.entry })
    expect(first.entry.id).toMatch(/^\d{14}-tool-result-omitted-[0-9a-f]{8}$/)
    expect(await log.list()).toEqual([first.entry])
    expect(await log.records()).toEqual([{ entry: first.entry, occurrences: 2 }])

    const updated = await log.update(first.entry.id, { ...friction, issue: 'wevm/frog#123' })
    expect(updated.issue).toBe('wevm/frog#123')
    await expect(log.remove(first.entry.id)).resolves.toBe(true)
    await expect(log.remove(first.entry.id)).resolves.toBe(false)
    await expect(log.get(first.entry.id)).rejects.toBeInstanceOf(PostgresStore.NotFoundError)
  })

  test('behavior: namespaces isolate consumers and force preserves intentional duplicates', async () => {
    const client = new FakeClient()
    const first = new FrictionLog({ store: PostgresStore.adapter({ client, namespace: 'one' }) })
    const second = new FrictionLog({ store: PostgresStore.adapter({ client, namespace: 'two' }) })

    await first.record(friction)
    await first.record(friction, { force: true })
    await second.record(friction)
    expect(await first.list()).toHaveLength(2)
    expect(await second.list()).toHaveLength(1)
  })

  test('error: rejects unsafe schema names before issuing SQL', () => {
    expect(() =>
      PostgresStore.adapter({
        client: new FakeClient(),
        namespace: 'one',
        schema: 'public; DROP TABLE users',
      }),
    ).toThrow('Postgres schema must be a SQL identifier.')
  })

  test('behavior: consumer context round trips without Frog interpreting it', () => {
    const serialized = Entry.serialize(friction)
    expect(Entry.parse(serialized, { id: 'one' }).context).toEqual(friction.context)
  })
})
