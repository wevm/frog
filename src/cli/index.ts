#!/usr/bin/env node
import { cac } from 'cac'

import { version } from '../version.js'
import { dev } from './commands/dev.js'
import { build } from './commands/vercel-build.js'

export const cli = cac('frog')

cli
  .command(
    '[entry]',
    'Start a development server at an optional entrypoint (default: (src|api)/index.{tsx,jsx,ts,js}).',
  )
  .alias('dev')
  .option('-h, --host', 'Expose host URL')
  .option('-p, --port <number>', 'Port used by the server (default: 5173)')
  .option('-s, --staticDir [string]', 'Path to static files (default: public)')
  .option('--ui', 'Run standalone devtools')
  .example((name) => `${name} dev --host`)
  .example((name) => `${name} dev --port 6969`)
  .example((name) => `${name} dev --ui`)
  .action(dev)

cli
  .command(
    'vercel-build',
    'Builds an output conforming to the Vercel Build Output API.',
  )
  .example((name) => `${name} vercel-build`)
  .action(build)

cli.help()
cli.version(version)

try {
  process.title = 'node (frog)'
} catch {}

cli.parse()
