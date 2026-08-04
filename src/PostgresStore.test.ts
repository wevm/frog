import * as Entry from './Entry.js'
import { FrictionLog } from './FrictionLog.js'
import * as PostgresStore from './PostgresStore.js'
import { FakePostgresClient } from '../test/postgres.js'
import { storeContract } from '../test/storeContract.js'

const friction = {
  body: 'The tool required an unnecessary workaround.',
  context: { source: 'production-agent', trace: 'opaque-reference' },
  severity: 'major',
  title: 'Tool result omitted its state',
} as const

describe('PostgresStore', () => {
  test('behavior: migration is explicit, namespaced, and idempotent SQL', async () => {
    const client = new FakePostgresClient()
    await PostgresStore.migrate({ client, namespace: 'unused', schema: 'frog' })
    expect(client.queries).toHaveLength(2)
    expect(client.queries[0]).toBe('CREATE SCHEMA IF NOT EXISTS "frog"')
    expect(client.queries[1]).toContain('CREATE TABLE IF NOT EXISTS "frog"."frog_entries"')
    expect(client.queries[1]).toContain('UNIQUE (namespace, dedupe_key)')
  })

  test('behavior: an omitted schema follows the client search path', async () => {
    const client = new FakePostgresClient()
    await PostgresStore.migrate({ client, namespace: 'unused' })
    expect(client.queries).toHaveLength(1)
    expect(client.queries[0]).toContain('CREATE TABLE IF NOT EXISTS "frog_entries"')

    const log = new FrictionLog({
      store: PostgresStore.adapter({ client, namespace: 'consumer-a' }),
    })
    await log.record(friction)
    expect(client.queries.at(-1)).toContain('INSERT INTO "frog_entries"')
  })

  test('behavior: records, deduplicates, updates, lists, and removes through the public API', async () => {
    const client = new FakePostgresClient()
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
    const client = new FakePostgresClient()
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
        client: new FakePostgresClient(),
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
  PostgresStore.adapter({ client: new FakePostgresClient(), namespace: 'contract' }),
)
