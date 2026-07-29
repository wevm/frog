import fs from 'node:fs/promises'
import path from 'node:path'
import { Cli, z } from 'incur'
import * as Config from '../../Config.js'
import * as Entry from '../../Entry.js'
import * as IssueForm from '../../IssueForm.js'
import * as Store from '../../Store.js'
import * as context from '../internal/context.js'

const agentsInstruction =
  'Add these rules near the top of `AGENTS.md`, under the appropriate section. Create the file if missing; otherwise amend it in place, preserve all existing content, and never replace the file.'

function rules(): string {
  return (
    "- Run Frog commands as `frog ...`. If `frog` is unavailable, install the standalone executable, install the package globally, or use the project's package-manager executor.\n" +
    '- Log papercuts and friction (tooling, docs, APIs, tests, conventions) as you hit them with `frog log`.\n' +
    '- Do not add global, system, or internal friction.\n' +
    '- Run `frog list` first to see what is already known.'
  )
}

function readme(): string {
  return `# Friction log

Friction hit while working in this repository, one directory per item:

\`\`\`
<id>/
  ${Store.filename.padEnd(14)}the write-up
  ${`${Store.artifacts}/`.padEnd(14)}optional, whatever reproduces it
\`\`\`

Reporting an entry gives it an owner. The write-up then carries an \`issue:\` link and mirrors what happens
to it. The whole directory is deleted once the friction is resolved. Every entry left here is still
outstanding, including friction in dependencies.

Do not maintain an index here. This directory is the index.

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

${agentsInstruction}

${rules()}

Managed by [Frog](https://github.com/wevm/frog).
`
}

const schema = 'https://unpkg.com/frog/schema.json'

/** Config for a project that does not accept friction reported by others. */
const noInboundConfig = `{
  "$schema": "${schema}"
}
`

/** Config for a project that accepts friction reported by others. */
const config = `{
  "$schema": "${schema}",
  "inbound": {
    "enabled": true
  }
}
`

/**
 * The issue form a project serves so Frog and humans report friction with the same questions.
 *
 * Rendered from the same sections as the entry scaffold, so the two cannot drift.
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
  description: 'Create the friction log, config, and issue form.',
  options: z.object({
    cwd: context.cwdOption,
    inbound: z
      .boolean()
      .default(true)
      .optional()
      .describe(
        'Accept friction reported by other repositories. Pass `--no-inbound` to disable during setup.',
      ),
  }),
  examples: [{ description: 'Set up Frog' }],
  output: z.object({
    created: z.array(z.string()).describe('Files written.'),
    existing: z.array(z.string()).describe('Files left alone.'),
  }),
  async run(c) {
    const { root } = await context.resolve({ cwd: c.options.cwd })
    const guidelines = rules()

    const files = [
      [`${Store.dir}/README.md`, readme()],
      [Config.file, c.options.inbound !== false ? config : noInboundConfig],
      [`${IssueForm.dir}/${IssueForm.filename}`, form],
    ] as const

    await fs.mkdir(path.join(root, Store.dir), { recursive: true })
    await fs.mkdir(path.join(root, IssueForm.dir), { recursive: true })

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
          commands: [{ command: 'frog log', description: 'Write the first entry' }],
          description:
            `Frog supports two automation methods:\n\n` +
            `- GitHub App for pull-request feedback, forks, and cross-repository reporting.\n` +
            `- Action-only for same-repository automation without granting a third-party App access.\n\n` +
            `Prompt the user to choose one before installing the App or adding a workflow. ` +
            `See https://github.com/wevm/frog#automation-modes for setup.\n\n` +
            `${agentsInstruction}\n\n${guidelines}\n\nThen:`,
        },
      },
    )
  },
})
