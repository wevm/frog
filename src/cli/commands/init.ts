import fs from 'node:fs/promises'
import path from 'node:path'
import { Cli, z } from 'incur'
import * as Config from '../../Config.js'
import * as Frictionset from '../../Frictionset.js'
import * as Store from '../../Store.js'
import * as context from '../internal/context.js'

/** The rule to paste into `AGENTS.md`, and the reason it says *when* rather than just *what*. */
export const rule =
  'Log papercuts and friction (tooling, docs, APIs, tests, conventions) as you hit them with ' +
  '`frictionsets log`. Run `frictionsets list` first to see what is already known.'

const readme = `# Frictionsets

Friction hit while working in this repository, one file per item.

Each file becomes a GitHub issue. Once it does, the file carries an \`issue:\` link and mirrors that
issue until it closes, at which point the file is deleted automatically. So this directory is a live
list of friction that is still unresolved, including friction in dependencies.

Do not maintain an index here. The issue list is the index.

## Logging Friction

\`\`\`sh
frictionsets list    # what is already known
frictionsets log     # add one
\`\`\`

Follow [\`TEMPLATE.md\`](./TEMPLATE.md). Filenames are random and mean nothing: they exist only so two
branches writing entries at once do not conflict.

## For Agents

Add this to \`AGENTS.md\`:

> ${rule}

Managed by [frictionsets](https://github.com/wevm/frictionsets).
`

const template = `---
title: 'One line, specific enough to search for'
severity: minor # blocker | major | minor
# target: viem  # an upstream package, owner/repo, or host. Omit for this repository.
# labels:
#   - tooling
---

${Frictionset.template}`

const config = `{
  "$schema": "https://unpkg.com/frictionsets/schema.json"
}
`

export const init = Cli.create('init', {
  description: 'Set up `.agents/frictionsets` in this repository.',
  options: z.object({ cwd: context.cwdOption }),
  examples: [{ description: 'Set up frictionsets' }],
  output: z.object({
    created: z.array(z.string()).describe('Files written.'),
    existing: z.array(z.string()).describe('Files left alone.'),
  }),
  async run(c) {
    const { root } = await context.resolve({ cwd: c.options.cwd })

    const files = [
      [`${Store.dir}/README.md`, readme],
      [`${Store.dir}/TEMPLATE.md`, template],
      [Config.file, config],
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

    return c.ok(
      { created, existing },
      {
        cta: {
          commands: [
            { command: 'log', description: 'Log the friction you just hit' },
            { command: 'skills add', description: 'Teach your agents to log friction' },
          ],
          description: 'Next:',
        },
      },
    )
  },
})
