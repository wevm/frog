import { storeContract } from '../test/storeContract.js'
import { testPostgres } from '../test/postgres.js'
import * as Entry from './Entry.js'
import * as Frog from './Frog.js'
import * as Store from './Store.js'

const friction = {
  body: 'The tool required an unnecessary workaround.',
  context: { source: 'production-agent', trace: 'opaque-reference' },
  severity: 'major',
  title: 'Tool result omitted its state',
} as const

const postgres = testPostgres()

describe('postgres', () => {
  test('behavior: migration creates the configured schema and is idempotent', async () => {
    const client = postgres.client()
    const store = Store.postgres({ client, namespace: 'consumer-a', schema: 'frog' })
    const table = async () =>
      client.query<{ table_name: string }>(
        `SELECT table_name
         FROM information_schema.tables
         WHERE table_schema = 'frog' AND table_name = 'frog_entries'`,
      )

    await expect(table()).resolves.toMatchObject({ rows: [] })
    await store.migrate()
    await store.migrate()

    await expect(table()).resolves.toMatchObject({ rows: [{ table_name: 'frog_entries' }] })
  })

  test('behavior: an omitted schema follows the client search path', async () => {
    const client = postgres.client()
    const store = Store.postgres({ client, namespace: 'search-path' })
    const frog = Frog.create({ store })

    await store.migrate()
    await frog.log(friction)

    const result = await client.query<{ table_schema: string }>(
      `SELECT table_schema
       FROM information_schema.tables
       WHERE table_schema = current_schema() AND table_name = 'frog_entries'`,
    )
    expect(result.rows).toEqual([{ table_schema: 'public' }])
  })

  test('behavior: logs, deduplicates, updates, lists, and removes', async () => {
    const store = await postgres.store()
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
    const store = await postgres.store()
    const frog = Frog.create({ store })
    const first = await frog.log(friction)

    await store.write({ ...friction, title: 'Tool state was omitted' }, { id: first.entry.id })
    const repeated = await frog.log({ ...friction, title: 'tool state was omitted!' })

    expect(repeated).toMatchObject({ created: false, occurrences: 2 })
    expect(repeated.entry.id).toBe(first.entry.id)
  })

  test('behavior: namespaces isolate consumers and force preserves intentional duplicates', async () => {
    const client = postgres.client()
    const first = Frog.create({ store: Store.postgres({ client, namespace: 'one' }) })
    const second = Frog.create({ store: Store.postgres({ client, namespace: 'two' }) })

    await first.store.migrate()
    await first.log(friction)
    await first.log(friction, { force: true })
    await second.log(friction)
    expect(await first.logs()).toHaveLength(2)
    expect(await second.logs()).toHaveLength(1)
  })

  test('behavior: removal uses returned rows when the client omits rowCount', async () => {
    const client: Store.postgres.Client = {
      async query<T extends Record<string, unknown> = Record<string, unknown>>(
        text: string,
        values?: unknown[],
      ): Promise<{ rows: T[] }> {
        const result = await postgres.client().query<T>(text, values)
        return { rows: result.rows }
      },
    }
    const store = Store.postgres({ client, namespace: 'remove-without-row-count' })
    await store.migrate()
    const written = await store.write(friction)

    await expect(store.remove(written.id)).resolves.toBe(true)
    await expect(store.remove(written.id)).resolves.toBe(false)
  })

  test('error: rejects unsafe schema names before issuing SQL', () => {
    expect(() =>
      Store.postgres({
        client: postgres.client(),
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

storeContract('Postgres', () => postgres.store())
