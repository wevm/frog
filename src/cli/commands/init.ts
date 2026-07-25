import fs from 'node:fs/promises'
import path from 'node:path'
import { Cli, z } from 'incur'
import * as Config from '../../Config.js'
import * as Entry from '../../Entry.js'
import * as Store from '../../Store.js'
import * as context from '../internal/context.js'

/** The rule to paste into `AGENTS.md`, and the reason it says *when* rather than just *what*. */
export const rule =
  'Log papercuts and friction (tooling, docs, APIs, tests, conventions) as you hit them with ' +
  '`frog log`. Run `frog list` first to see what is already known.'

const readme = `# Friction log

Friction hit while working in this repository, one file per item.

Filing an entry gives it an owner. The file then carries an \`issue:\` link, mirrors what happens to it,
and is deleted once the friction is resolved. So this directory is a live list of friction that is still
outstanding, including friction in dependencies.

Do not maintain an index here. This directory is the index, and it is kept true without anyone
remembering to.

## Logging Friction

\`\`\`sh
frog list    # what is already known
frog log     # add one
\`\`\`

Follow [\`TEMPLATE.md\`](./TEMPLATE.md). Filenames are random and mean nothing: they exist only so two
branches writing entries at once do not conflict.

## For Agents

Add this to \`AGENTS.md\`:

> ${rule}

Managed by [frog](https://github.com/wevm/frog).
`

const template = `---
title: 'One line, specific enough to search for'
severity: minor # blocker | major | minor
# target: viem  # an upstream package, owner/repo, or host. Omit for this repository.
# labels:
#   - tooling
---

${Entry.template}`

const schema = 'https://unpkg.com/frog/schema.json'

const config = `{
  "$schema": "${schema}"
}
`

/** Config for a project that accepts friction reported by others. */
const libraryConfig = `{
  "$schema": "${schema}",
  "inbound": {
    "enabled": true
  }
}
`

export const init = Cli.create('init', {
  description: 'Set up `.agents/friction-log` in this repository.',
  options: z.object({
    cwd: context.cwdOption,
    library: z
      .boolean()
      .optional()
      .describe('Also accept friction reported by consumers of this project.'),
  }),
  examples: [
    { description: 'Set up frog' },
    { description: 'Become a friction target', options: { library: true } },
  ],
  output: z.object({
    created: z.array(z.string()).describe('Files written.'),
    declare: z
      .string()
      .optional()
      .describe('With --library, the `package.json` field to add so installers can find this.'),
    existing: z.array(z.string()).describe('Files left alone.'),
  }),
  async run(c) {
    const { repo, root } = await context.resolve({ cwd: c.options.cwd })

    const files = [
      [`${Store.dir}/README.md`, readme],
      [`${Store.dir}/TEMPLATE.md`, template],
      [Config.file, c.options.library ? libraryConfig : config],
    ] as const

    await fs.mkdir(path.join(root, Store.dir), { recursive: true })

    const created: string[] = []
    const existing: string[] = []
    for (const [file, contents] of files) {
      // `wx` fails rather than clobbering, so re-running init never destroys local edits.
      try {
        await fs.writeFile(path.join(root, file), contents, { encoding: 'utf8', flag: 'wx' })
        created.push(file)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
        existing.push(file)
      }
    }

    // Printed rather than written: rewriting `package.json` would reformat a file we do not own.
    const declare =
      c.options.library && repo
        ? JSON.stringify({ frog: { inbound: true, repo } }, null, 2)
        : undefined

    return c.ok(
      { created, existing, ...(declare ? { declare } : {}) },
      {
        cta: {
          commands: c.options.library
            ? [
                { command: 'manifest', description: 'Print the document to serve on your site' },
                { command: 'skills add', description: 'Teach your agents to log friction' },
              ]
            : [
                { command: 'log', description: 'Log the friction you just hit' },
                { command: 'skills add', description: 'Teach your agents to log friction' },
              ],
          description: 'Next:',
        },
      },
    )
  },
})
