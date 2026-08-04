import { Binary, Cli, middleware, z } from 'incur'
import { init } from './commands/init.js'
import { list } from './commands/list.js'
import { log } from './commands/log.js'
import { migrate } from './commands/migrate.js'
import { publish } from './commands/publish.js'
import { resolve } from './commands/resolve.js'
import { sync } from './commands/sync.js'
import { targets } from './commands/targets.js'
import * as context from './internal/context.js'
import * as packageManager from './internal/packageManager.js'
import * as environmentStore from './internal/store.js'
import type * as Store from '../Store.js'

const globalOptionValues = new Set([
  '--filter-output',
  '--format',
  '--token-limit',
  '--token-offset',
])

const storedCommands = new Set(['list', 'log', 'migrate', 'publish', 'resolve', 'sync'])
const introspectionOptions = new Set(['--help', '--llms', '--llms-full', '--schema', '--version'])
const envSchema = z.object({
  FROG_DATABASE_URL: z
    .string()
    .optional()
    .describe('Postgres URL. Its presence selects the Postgres store.'),
  FROG_NAMESPACE: z.string().optional().describe('Postgres namespace. Defaults to `default`.'),
  FROG_SCHEMA: z.string().optional().describe('Optional Postgres schema.'),
})

/** Creates the CLI with one optional store for commands that persist friction. */
export function create(options: create.Options = {}) {
  return Cli.create('frog', {
    description: 'Automated friction logging for agents.',
    env: envSchema,
    vars: environmentStore.vars,
    sync: {
      depth: 1,
      suggestions: [
        'log the friction I just hit',
        'show me which of my dependencies accept friction reports',
      ],
    },
    update: Binary.github({ repository: 'wevm/frog' }),
  })
    .use(
      middleware<typeof environmentStore.vars, typeof envSchema>(async (context, next) => {
        if (options.store) context.set('store', options.store)
        await next()
      }),
    )
    .command(init)
    .command(list)
    .command(log)
    .command(migrate)
    .command(publish)
    .command(resolve)
    .command(sync)
    .command(targets)
}

export declare namespace create {
  type Options = {
    /** Store injected into commands that persist friction. The file store is derived per command by default. */
    store?: Store.Store | undefined
  }
}

export const cli = create()

/** Serves init with the project runner when one is detected. */
export async function serve(argv: string[] = process.argv.slice(2), options: serve.Options = {}) {
  const { store, ...serveOptions } = options
  const selected =
    store === undefined && usesStore(argv)
      ? await environmentStore.resolve(options.env ?? process.env)
      : undefined
  const commandStore = store ?? selected?.store
  const runnerCli = create(commandStore ? { store: commandStore } : {})
  const run = async () => {
    if (command(argv) !== 'init') return runnerCli.serve(argv, serveOptions)

    const { root } = await context.resolve({ cwd: option(argv, '--cwd') })
    const runner = await packageManager.resolve({ env: options.env, root })
    if (!runner) return runnerCli.serve(argv, serveOptions)
    return Cli.create(runner).command(init).serve(argv, serveOptions)
  }
  try {
    return await run()
  } finally {
    await selected?.close()
  }
}

export declare namespace serve {
  type Options = Cli.serve.Options & create.Options
}

export default cli

function command(argv: readonly string[]): string | undefined {
  for (let index = 0; index < argv.length; index++) {
    const value = argv[index]
    if (!value) continue
    if (globalOptionValues.has(value)) {
      index++
      continue
    }
    if (!value.startsWith('-')) return value
  }
  return undefined
}

function option(argv: readonly string[], name: string): string | undefined {
  for (let index = 0; index < argv.length; index++) {
    const value = argv[index]
    if (value === name) return argv[index + 1]
    if (value?.startsWith(`${name}=`)) return value.slice(name.length + 1)
  }
  return undefined
}

function usesStore(argv: readonly string[]): boolean {
  if (argv.some((value) => introspectionOptions.has(value))) return false
  return argv.includes('--mcp') || storedCommands.has(command(argv) ?? '')
}
