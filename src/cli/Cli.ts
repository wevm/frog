import { Binary, Cli } from 'incur'
import { init } from './commands/init.js'
import { list } from './commands/list.js'
import { log } from './commands/log.js'
import { publish } from './commands/publish.js'
import { sync } from './commands/sync.js'
import { targets } from './commands/targets.js'

export const cli = Cli.create('frog', {
  description: 'Automated friction logging for agents.',
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
  .command(publish)
  .command(sync)
  .command(targets)

/** Serves the Frog CLI. */
export async function serve(
  argv: string[] = process.argv.slice(2),
  options: Cli.serve.Options = {},
) {
  return cli.serve(argv, options)
}

export default cli
