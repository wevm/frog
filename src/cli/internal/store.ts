import { createRequire } from 'node:module'
import { z } from 'incur'
import * as Store from '../../Store.js'

export type Environment = Record<string, string | undefined>

/** Middleware variables shared by commands that persist friction. */
export const vars = z.object({ store: z.custom<Store.Store>().optional() })

export type Selection = {
  store: Store.Store
  close(): Promise<void>
}

export type Configuration =
  | { kind: 'file' }
  | {
      connectionString: string
      kind: 'postgres'
      namespace: string
      schema?: string | undefined
    }

/** Infers the store from conventional environment variables without opening a connection. */
export function configuration(env: Environment): Configuration {
  const connectionString = env['FROG_DATABASE_URL']?.trim()
  if (!connectionString) return { kind: 'file' }

  const schema = env['FROG_SCHEMA']?.trim()
  return {
    connectionString,
    kind: 'postgres',
    namespace: env['FROG_NAMESPACE']?.trim() || 'default',
    ...(schema ? { schema } : {}),
  }
}

/** Resolves the optional CLI store without making a database driver a hard Frog dependency. */
export async function resolve(env: Environment): Promise<Selection | undefined> {
  const selected = configuration(env)
  if (selected.kind === 'file') return undefined

  const require = createRequire(import.meta.url)
  let Pool: new (options: { connectionString: string }) => Store.postgres.Client & {
    end(): Promise<void>
  }
  try {
    ;({ Pool } = require('pg') as { Pool: typeof Pool })
  } catch (error) {
    throw new Error('The Postgres CLI store requires the optional `pg` package.', { cause: error })
  }
  const client = new Pool({ connectionString: selected.connectionString })
  return {
    store: Store.postgres({
      client,
      namespace: selected.namespace,
      ...(selected.schema ? { schema: selected.schema } : {}),
    }),
    close: () => client.end(),
  }
}
