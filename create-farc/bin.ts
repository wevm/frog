#!/usr/bin/env node
import { createRequire } from 'node:module'
import { cac } from 'cac'
import { type CreateParameters, create } from './create.js'
import { getTemplates } from './utils/getTemplates.js'

const require = createRequire(import.meta.url)
const pkg = require('../package.json')

const cli = cac('create-farc')

const templates = getTemplates()

cli
  .usage('[options]')
  .option('-n, --name [name]', 'Name of project.')
  .option(
    '-t, --template [template]',
    `Project template to use. Templates: ${templates.join(',')}`,
  )

cli.help()
cli.version(pkg.version)

const { options } = cli.parse()

if (!options.help) create(options as CreateParameters)
