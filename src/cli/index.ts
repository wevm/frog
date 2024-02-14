#!/usr/bin/env node
import { cac } from 'cac'

import { build as build_vercel } from './commands/vercel-build.js'
import { version } from './version.js'

export const cli = cac('farc')

cli.command('vercel-build').action(build_vercel)

cli.help()
cli.version(version)

cli.parse()
