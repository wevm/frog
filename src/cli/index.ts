#!/usr/bin/env node
import { cac } from 'cac'

import { version } from '../version.js'
import { dev } from './commands/dev.js'
import { build as build_vercel } from './commands/vercel-build.js'

export const cli = cac('frog')

cli
  .command(
    '[entry]',
    'Start a development server at an optional entrypoint (default: (src|api)/index.{tsx,jsx,ts,js}).',
  )
  .alias('dev')
  .option('-h, --host', 'Expose host URL')
  .option('-p, --port [number]', 'Port used by the server (default: 5173)')
  .option('-P, --proxy', 'Start ngrok proxy for dev server')
  .action(dev)
cli
  .command(
    'vercel-build',
    'Builds an output conforming to the Vercel Build Output API.',
  )
  .action(build_vercel)

cli.help()
cli.version(version)

cli.parse()
