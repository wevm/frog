import { randomUUID } from 'node:crypto'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import postgresjs from 'postgres'
import * as Store from '../src/Store.js'

const image = 'postgres:18-alpine'

/** Starts one isolated Postgres container for the importing test file. */
export function get(): get.ReturnType {
  let container: StartedPostgreSqlContainer | undefined
  let client: postgresjs.Sql | undefined
  let connectionString: string | undefined

  beforeAll(async () => {
    container = await new PostgreSqlContainer(image).start()
    connectionString = container.getConnectionUri()
    client = postgresjs(connectionString)
  }, 120_000)

  afterAll(async () => {
    try {
      await client?.end()
    } finally {
      await container?.stop()
    }
  }, 120_000)

  const getClient = () => {
    if (!client) throw new Error('Postgres test container has not started.')
    return client
  }

  const getConnectionString = () => {
    if (!connectionString) throw new Error('Postgres test container has not started.')
    return connectionString
  }

  const create = (options: get.Options = {}) => {
    const store = Store.postgres({
      connectionString: getConnectionString(),
      namespace: options.namespace ?? randomUUID(),
      ...(options.schema ? { schema: options.schema } : {}),
    })
    onTestFinished(() => store.close())
    return store
  }

  return {
    client: getClient,
    connectionString: getConnectionString,
    create,
    async store(options = {}) {
      const store = create(options)
      await store.migrate()
      return store
    },
  }
}

export declare namespace get {
  /** Options for constructing an isolated store inside the test database. */
  type Options = {
    /** Namespace for a test that needs to coordinate multiple stores. */
    namespace?: string | undefined
    /** Optional schema for the store table. */
    schema?: string | undefined
  }

  /** Container-backed Postgres test fixture. */
  type ReturnType = {
    /** Returns the connected Postgres.js client after the test hook starts the container. */
    readonly client: () => postgresjs.Sql
    /** Returns the container connection string after the test hook starts the container. */
    readonly connectionString: () => string
    /** Creates an unmigrated store with an isolated namespace. */
    readonly create: (options?: Options) => Store.Store
    /** Creates and migrates a store with an isolated namespace. */
    readonly store: (options?: Options) => Promise<Store.Store>
  }
}
