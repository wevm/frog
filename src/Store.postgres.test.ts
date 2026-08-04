import { fakePostgresClient } from '../test/postgres.js'
import { storeContract } from '../test/storeContract.js'
import * as Entry from './Entry.js'
import * as Frog from './Frog.js'
import * as Store from './Store.js'

const friction = {
  body: 'The tool required an unnecessary workaround.',
  context: { source: 'production-agent', trace: 'opaque-reference' },
  severity: 'major',
  title: 'Tool result omitted its state',
} as const

describe('postgres', () => {
  test('behavior: migration is explicit, namespaced, and idempotent SQL', async () => {
    const client = fakePostgresClient()
    const store = Store.postgres(client, { namespace: 'consumer-a', schema: 'frog' })

    await store.migrate()

    expect(client.queries).toHaveLength(2)
    expect(client.queries[0]).toBe('CREATE SCHEMA IF NOT EXISTS "frog"')
    expect(client.queries[1]).toContain('CREATE TABLE IF NOT EXISTS "frog"."frog_entries"')
    expect(client.queries[1]).toContain('UNIQUE (namespace, dedupe_key)')
  })

  test('behavior: an omitted schema follows the client search path', async () => {
    const client = fakePostgresClient()
    const store = Store.postgres(client, { namespace: 'consumer-a' })
    const frog = Frog.create({ store })

    await store.migrate()
    await frog.log(friction)

    expect(client.queries).toHaveLength(2)
    expect(client.queries[0]).toContain('CREATE TABLE IF NOT EXISTS "frog_entries"')
    expect(client.queries[1]).toContain('INSERT INTO "frog_entries"')
  })

  test('behavior: logs, deduplicates, updates, lists, and removes', async () => {
    const store = Store.postgres(fakePostgresClient(), { namespace: 'consumer-a' })
    const frog = Frog.create({ store })

    const first = await frog.log(friction)
    const repeated = await frog.log({ ...friction, body: 'A later occurrence.' })
    expect(first).toMatchObject({ created: true, occurrences: 1 })
    expect(repeated).toMatchObject({ created: false, occurrences: 2, entry: first.entry })
    expect(first.entry.id).toMatch(/^\d{14}-tool-result-omitted-[0-9a-f]{8}$/)
    expect(await frog.logs()).toEqual([{ entry: first.entry, occurrences: 2 }])

    await store.write({ ...friction, issue: 'wevm/frog#123' }, { id: first.entry.id })
    expect((await store.get(first.entry.id)).issue).toBe('wevm/frog#123')
    await expect(store.remove(first.entry.id)).resolves.toBe(true)
    await expect(store.remove(first.entry.id)).resolves.toBe(false)
    await expect(store.get(first.entry.id)).rejects.toMatchObject({
      code: 'ENTRY_NOT_FOUND',
      name: 'Store.NotFoundError',
    })
  })

  test('behavior: updating a logged title moves its deduplication identity', async () => {
    const store = Store.postgres(fakePostgresClient(), { namespace: 'consumer-a' })
    const frog = Frog.create({ store })
    const first = await frog.log(friction)

    await store.write({ ...friction, title: 'Tool state was omitted' }, { id: first.entry.id })
    const repeated = await frog.log({ ...friction, title: 'tool state was omitted!' })

    expect(repeated).toMatchObject({ created: false, occurrences: 2 })
    expect(repeated.entry.id).toBe(first.entry.id)
  })

  test('behavior: namespaces isolate consumers and force preserves intentional duplicates', async () => {
    const client = fakePostgresClient()
    const first = Frog.create({ store: Store.postgres(client, { namespace: 'one' }) })
    const second = Frog.create({ store: Store.postgres(client, { namespace: 'two' }) })

    await first.log(friction)
    await first.log(friction, { force: true })
    await second.log(friction)
    expect(await first.logs()).toHaveLength(2)
    expect(await second.logs()).toHaveLength(1)
  })

  test('behavior: removal uses returned rows when the client omits rowCount', async () => {
    const backing = fakePostgresClient()
    const client: Store.postgres.Client = {
      async query<T extends Record<string, unknown> = Record<string, unknown>>(
        text: string,
        values?: unknown[],
      ): Promise<{ rows: T[] }> {
        const result = await backing.query<T>(text, values)
        return { rows: result.rows }
      },
    }
    const store = Store.postgres(client, { namespace: 'consumer-a' })
    const written = await store.write(friction)

    await expect(store.remove(written.id)).resolves.toBe(true)
    await expect(store.remove(written.id)).resolves.toBe(false)
  })

  test('error: rejects unsafe schema names before issuing SQL', () => {
    expect(() =>
      Store.postgres(fakePostgresClient(), {
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

storeContract('Postgres', async () =>
  Store.postgres(fakePostgresClient(), { namespace: 'contract' }),
)
