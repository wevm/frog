import { randomUUID } from 'node:crypto'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { Pool } from 'pg'
import * as Store from '../src/Store.js'

const image = 'postgres:18-alpine'

/** Starts one isolated Postgres container for the importing test file. */
export function testPostgres(): testPostgres.ReturnType {
  let container: StartedPostgreSqlContainer | undefined
  let client: Pool | undefined

  beforeAll(async () => {
    container = await new PostgreSqlContainer(image).start()
    client = new Pool({ connectionString: container.getConnectionUri() })
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

  return {
    client: getClient,
    async store(options = {}) {
      const store = Store.postgres(getClient(), {
        namespace: options.namespace ?? randomUUID(),
        ...(options.schema ? { schema: options.schema } : {}),
      })
      await store.migrate()
      return store
    },
  }
}

export declare namespace testPostgres {
  /** Options for constructing an isolated store inside the test database. */
  type Options = {
    /** Namespace for a test that needs to coordinate multiple stores. */
    namespace?: string | undefined
    /** Optional schema for the store table. */
    schema?: string | undefined
  }

  /** Container-backed Postgres test fixture. */
  type ReturnType = {
    /** Returns the connected pool after the test hook starts the container. */
    readonly client: () => Pool
    /** Creates and migrates a store with an isolated namespace. */
    readonly store: (options?: Options) => Promise<Store.Store>
  }
}
