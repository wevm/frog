import fs from 'node:fs/promises'
import path from 'node:path'
import { Cli, z } from 'incur'
import * as Config from '../../Config.js'
import * as Entry from '../../Entry.js'
import * as IssueForm from '../../IssueForm.js'
import * as Store from '../../Store.js'
import * as context from '../internal/context.js'

/** The rule to paste into `AGENTS.md`. */
export const rule =
  'Log papercuts and friction (tooling, docs, APIs, tests, conventions) as you hit them with ' +
  '`frog log`. Run `frog list` first to see what is already known.'

/** Where to install the GitHub App, which is what makes filing and reconciling automatic. */
const install = 'https://github.com/apps/frog-fm/installations/new'

const readme = `# Friction log

Friction hit while working in this repository, one directory per item:

\`\`\`
<id>/
  ${Store.filename.padEnd(14)}the write-up
  ${`${Store.artifacts}/`.padEnd(14)}optional, whatever reproduces it
\`\`\`

Filing an entry gives it an owner. The write-up then carries an \`issue:\` link and mirrors what happens
to it. The whole directory is deleted once the friction is resolved. Every entry left here is still
outstanding, including friction in dependencies.

Do not maintain an index here. This directory is the index.

Install the [frog GitHub App](${install}) and entries are filed, linked, and removed as their issues
close, without anyone running anything. Without it, run \`frog publish\` and \`frog sync\` yourself with a
GitHub token.

## Logging Friction

\`\`\`sh
frog list    # what is already known
frog log     # add one
\`\`\`

\`frog log\` writes the sections to fill in. Each id is when the friction was hit plus its title, so
the directory reads oldest-first.

Put anything that reproduces the friction in that entry's \`${Store.artifacts}/\` and reference it from the
write-up. The next reader runs the reproduction instead of rebuilding it.

## For Agents

Add this to \`AGENTS.md\`:

> ${rule}

Managed by [Frog](https://github.com/wevm/frog).
`

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

/**
 * The issue form a project serves so consumers report friction the way it wants.
 *
 * Rendered from the same sections as the entry scaffold, so the two cannot drift. A consumer's Frog finds
 * it by convention and writes its entry against it. A human filing through the issue page gets the same
 * questions.
 */
const form = `name: Friction
description: Something about this project cost you time.
labels: [friction]
body:
${Entry.sections
  .map((section) =>
    [
      '  - type: textarea',
      '    attributes:',
      `      label: ${section.label}`,
      `      description: ${section.description}`,
      '    validations:',
      `      required: ${section.label === 'Current Behavior'}`,
    ].join('\n'),
  )
  .join('\n')}
`

export const init = Cli.create('init', {
  description: 'Create `.agents/friction-log` and its config.',
  options: z.object({
    cwd: context.cwdOption,
    library: z
      .boolean()
      .optional()
      .describe('Also accept friction reported by consumers of this project.'),
  }),
  examples: [
    { description: 'Set up Frog' },
    { description: 'Become a friction target', options: { library: true } },
  ],
  output: z.object({
    created: z.array(z.string()).describe('Files written.'),
    existing: z.array(z.string()).describe('Files left alone.'),
  }),
  async run(c) {
    const { root } = await context.resolve({ cwd: c.options.cwd })

    const files = [
      [`${Store.dir}/README.md`, readme],
      [Config.file, c.options.library ? libraryConfig : config],
      // Only for a project accepting reports: a consumer's Frog writes its entry against it.
      ...(c.options.library ? ([[`${IssueForm.dir}/${IssueForm.filename}`, form]] as const) : []),
    ] as const

    await fs.mkdir(path.join(root, Store.dir), { recursive: true })
    if (c.options.library) await fs.mkdir(path.join(root, IssueForm.dir), { recursive: true })

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
            { command: 'log', description: 'Write the first entry' },
            { command: 'skills add', description: 'Install the skill that says when to log' },
          ],
          description: `Install the GitHub App at ${install} to file and reconcile automatically, then:`,
        },
      },
    )
  },
})
