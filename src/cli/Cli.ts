import { Binary, Cli, z } from 'incur'
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
import * as Store from '../Store.js'

const globalOptionValues = new Set([
  '--filter-output',
  '--format',
  '--token-limit',
  '--token-offset',
])

export const cli = Cli.create('frog', {
  description: 'Automated friction logging for agents.',
  env: z.object({
    DATABASE_URL: z
      .string()
      .optional()
      .describe('Postgres URL. Its presence selects the Postgres store.'),
    FROG_NAMESPACE: z.string().optional().describe('Postgres namespace. Defaults to `default`.'),
    FROG_SCHEMA: z.string().optional().describe('Optional Postgres schema.'),
    FROG_STORE: z
      .enum(['file', 'postgres'])
      .optional()
      .describe('Override the inferred entry store.'),
  }),
  sync: {
    depth: 1,
    suggestions: [
      'log the friction I just hit',
      'show me which of my dependencies accept friction reports',
    ],
  },
  update: Binary.github({ repository: 'wevm/frog' }),
})
  .command(init)
  .command(list)
  .command(log)
  .command(migrate)
  .command(publish)
  .command(resolve)
  .command(sync)
  .command(targets)

/** Serves init with the project runner when one is detected. */
export async function serve(
  argv: string[] = process.argv.slice(2),
  options: Cli.serve.Options = {},
) {
  const selected = await environmentStore.resolve(options.env ?? process.env)
  const run = async () => {
    if (command(argv) !== 'init') return cli.serve(argv, options)

    const { root } = await context.resolve({ cwd: option(argv, '--cwd') })
    const runner = await packageManager.resolve({ env: options.env, root })
    if (!runner) return cli.serve(argv, options)
    return Cli.create(runner).command(init).serve(argv, options)
  }
  try {
    return selected ? await Store.withAdapter(selected.adapter, run) : await run()
  } finally {
    await selected?.close()
  }
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
