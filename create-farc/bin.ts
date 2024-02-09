#!/usr/bin/env node
import { createRequire } from 'node:module'
import { cac } from 'cac'
import { type CreateParameters, create } from './create.js'

const require = createRequire(import.meta.url)
const pkg = require('../package.json')

const cli = cac('create-vocs')

cli.usage('[options]').option('-n, --name [name]', 'Name of project')

cli.help()
cli.version(pkg.version)

const { options } = cli.parse()

if (!options.help) create(options as CreateParameters)
