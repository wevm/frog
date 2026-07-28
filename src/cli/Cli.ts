import { Cli } from 'incur'
import { init } from './commands/init.js'
import { list } from './commands/list.js'
import { log } from './commands/log.js'
import { publish } from './commands/publish.js'
import { sync } from './commands/sync.js'
import { targets } from './commands/targets.js'
import * as packageManager from './internal/packageManager.js'

const globalOptionValues = new Set([
  '--filter-output',
  '--format',
  '--token-limit',
  '--token-offset',
])

export const cli = Cli.create('frog', {
  description: 'Automated friction logging for agents.',
  sync: {
    depth: 1,
    suggestions: [
      'log the friction I just hit',
      'show me which of my dependencies accept friction reports',
    ],
  },
})
  .command(init)
  .command(list)
  .command(log)
  .command(publish)
  .command(sync)
  .command(targets)

/** Serves init with the invoking runner so Incur preserves absolute CTA commands. */
export function serve(argv: string[] = process.argv.slice(2), options: Cli.serve.Options = {}) {
  const root =
    command(argv) === 'init'
      ? Cli.create(packageManager.current({ env: options.env })).command(init)
      : cli
  return root.serve(argv, options)
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
