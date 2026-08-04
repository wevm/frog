import { storeContract } from '../test/storeContract.js'
import * as Postgres from '../test/postgres.js'
import * as Entry from './Entry.js'
import * as Frog from './Frog.js'
import * as Store from './Store.js'

const friction = {
  body: 'The tool required an unnecessary workaround.',
  context: { source: 'production-agent', trace: 'opaque-reference' },
  severity: 'major',
  title: 'Tool result omitted its state',
} as const

const postgres = Postgres.get()

describe('postgres', () => {
  test('behavior: Frog prepares storage before its first operation', async () => {
    const logStore = postgres.create({ schema: 'frog_create_log' })
    const logsStore = postgres.create({ schema: 'frog_create_logs' })

    await expect(Frog.create({ store: logStore }).log(friction)).resolves.toMatchObject({
      created: true,
    })
    await expect(Frog.create({ store: logsStore }).logs()).resolves.toEqual([])
  })

  test('behavior: migration creates the configured schema and is idempotent', async () => {
    const client = postgres.client()
    const store = postgres.create({ namespace: 'consumer-a', schema: 'frog' })
    const table = async () =>
      client<{ table_name: string }[]>`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'frog' AND table_name = 'frog_entries'
      `

    await expect(table()).resolves.toEqual([])
    await store.migrate()
    await store.migrate()

    await expect(table()).resolves.toEqual([{ table_name: 'frog_entries' }])
  })

  test('behavior: an omitted schema follows the client search path', async () => {
    const client = postgres.client()
    const store = postgres.create({ namespace: 'search-path' })
    const frog = Frog.create({ store })

    await store.migrate()
    await frog.log(friction)

    const result = await client<{ table_schema: string }[]>`
      SELECT table_schema
      FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_name = 'frog_entries'
    `
    expect(result).toEqual([{ table_schema: 'public' }])
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

  test('behavior: colliding title edits preserve independent entry identity', async () => {
    const store = await postgres.store()
    const frog = Frog.create({ store })
    const first = await frog.log(friction)
    const second = await frog.log({ ...friction, title: 'Different friction' })

    await store.write({ ...friction, title: 'Different friction' }, { id: first.entry.id })
    const repeated = await frog.log({ ...friction, title: 'different friction!' })

    expect(await store.get(first.entry.id)).toMatchObject({ title: 'Different friction' })
    expect(repeated).toMatchObject({ created: false, occurrences: 2 })
    expect(repeated.entry.id).toBe(second.entry.id)
  })

  test('behavior: namespaces isolate consumers and force preserves intentional duplicates', async () => {
    const first = Frog.create({ store: postgres.create({ namespace: 'one' }) })
    const second = Frog.create({ store: postgres.create({ namespace: 'two' }) })

    await first.store.migrate()
    await first.log(friction)
    await first.log(friction, { force: true })
    await second.log(friction)
    expect(await first.logs()).toHaveLength(2)
    expect(await second.logs()).toHaveLength(1)
  })

  test('behavior: namespace defaults to default', async () => {
    const store = Store.postgres({ connectionString: postgres.connectionString() })
    onTestFinished(() => store.close())
    await store.migrate()
    const written = await Frog.create({ store }).log(friction)

    expect(written.location).toMatch(/^postgres:default\//)
  })

  test('behavior: closing the owned pool is idempotent', async () => {
    const store = postgres.create()
    await store.migrate()

    await expect(store.close()).resolves.toBeUndefined()
    await expect(store.close()).resolves.toBeUndefined()
  })

  test('error: rejects an empty connection string', () => {
    expect(() => Store.postgres({ connectionString: ' ' })).toThrow(
      'Postgres connectionString is required.',
    )
  })

  test('error: rejects unsafe schema names before issuing SQL', () => {
    expect(() =>
      Store.postgres({
        connectionString: postgres.connectionString(),
        schema: 'public; DROP TABLE users',
      }),
    ).toThrow('Postgres schema must be a SQL identifier.')
  })

  test('error: rejects schema names PostgreSQL would truncate', () => {
    expect(() =>
      Store.postgres({
        connectionString: postgres.connectionString(),
        schema: `s${'a'.repeat(63)}`,
      }),
    ).toThrow('Postgres schema must be at most 63 bytes.')
  })

  test('behavior: consumer context round trips without Frog interpreting it', () => {
    const serialized = Entry.serialize(friction)
    expect(Entry.parse(serialized, { id: 'one' }).context).toEqual(friction.context)
  })
})

storeContract('Postgres', () => postgres.store())
