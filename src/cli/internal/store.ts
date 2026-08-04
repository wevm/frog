import { createRequire } from 'node:module'
import * as PostgresStore from '../../PostgresStore.js'
import type * as Store from '../../Store.js'

export type Environment = Record<string, string | undefined>

export type Selection = {
  adapter: Store.Adapter
  close(): Promise<void>
}

/** Resolves the optional CLI store without making a database driver a hard Frog dependency. */
export async function resolve(env: Environment): Promise<Selection | undefined> {
  const kind = env['FROG_STORE']?.trim().toLowerCase() || 'file'
  if (kind === 'file') return undefined
  if (kind !== 'postgres')
    throw new Error(`Unsupported FROG_STORE \`${kind}\`. Use \`file\` or \`postgres\`.`)

  const connectionString = env['FROG_DATABASE_URL']?.trim() || env['DATABASE_URL']?.trim()
  if (!connectionString)
    throw new Error('FROG_STORE=postgres requires FROG_DATABASE_URL or DATABASE_URL.')
  const namespace = env['FROG_NAMESPACE']?.trim()
  if (!namespace) throw new Error('FROG_STORE=postgres requires FROG_NAMESPACE.')

  const require = createRequire(import.meta.url)
  let Pool: new (options: { connectionString: string }) => PostgresStore.Client & {
    end(): Promise<void>
  }
  try {
    ;({ Pool } = require('pg') as { Pool: typeof Pool })
  } catch (error) {
    throw new Error('The Postgres CLI store requires the optional `pg` package.', { cause: error })
  }
  const client = new Pool({ connectionString })
  const schema = env['FROG_SCHEMA']?.trim()
  return {
    adapter: PostgresStore.adapter({
      client,
      namespace,
      ...(schema ? { schema } : {}),
    }),
    close: () => client.end(),
  }
}
