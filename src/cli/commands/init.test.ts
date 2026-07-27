import fs from 'node:fs/promises'
import path from 'node:path'
import * as cli from '../../../test/cli.js'
import * as helpers from '../../../test/helpers.js'
import * as Config from '../../Config.js'
import * as Entry from '../../Entry.js'
import * as IssueForm from '../../IssueForm.js'

test('behavior: scaffolds the directory', async () => {
  const cwd = await helpers.repo()

  expect(await cli.data(['init', '--cwd', cwd])).toMatchInlineSnapshot(`
    {
      "created": [
        ".agents/friction-log/README.md",
        ".agents/friction-log/config.json",
      ],
      "existing": [],
    }
  `)

  // Nothing is filed until the App is installed, and agents need the rule to log future friction.
  const { envelope } = await cli.run(['init', '--cwd', await helpers.repo()])
  const cta = envelope.meta?.['cta'] as
    | {
        commands?: { command?: string; description?: string }[]
        description?: string
      }
    | undefined
  expect(cta?.description).toMatchInlineSnapshot(`
    "Install the GitHub App at https://github.com/apps/frog-fm/installations/new and add this to \`AGENTS.md\` under the appropriate section:

    - Log papercuts and friction (tooling, docs, APIs, tests, conventions) as you hit them with \`frog log\`.
    - Do not add global, system, or internal friction.
    - Run \`frog list\` first to see what is already known.

    Then:"
  `)
  expect(cta?.commands?.[0]).toEqual({
    command: 'frog log',
    description: 'Write the first entry',
  })

  // The scaffolded config must validate against the schema it advertises.
  expect(await Config.resolve({ root: cwd })).toEqual(Config.from({}))
})

test('behavior: re-running never clobbers local edits', async () => {
  const cwd = await helpers.repo()
  await cli.data(['init', '--cwd', cwd])
  await fs.writeFile(path.join(cwd, Config.file), '{ "maxPerRun": 3 }', 'utf8')

  expect(await cli.data(['init', '--cwd', cwd])).toMatchObject({
    created: [],
    existing: ['.agents/friction-log/README.md', '.agents/friction-log/config.json'],
  })
  expect((await Config.resolve({ root: cwd })).maxPerRun).toBe(3)
})

describe('--library', () => {
  test('behavior: publishes an issue form a consumer can author against', async () => {
    const cwd = await helpers.repo()

    const result = await cli.data<{ created: string[] }>(['init', '--library', '--cwd', cwd])

    expect(result.created).toContain('.github/ISSUE_TEMPLATE/friction.yml')

    // The form and the entry scaffold are rendered from one list of sections, so the questions a
    // consumer is asked are the questions this project asks itself.
    const contents = await fs.readFile(path.join(cwd, IssueForm.dir, IssueForm.filename), 'utf8')
    const form = IssueForm.parse(contents)
    expect(form?.fields.map((field) => field.label)).toEqual(
      Entry.sections.map((section) => section.label),
    )
  })

  test('behavior: plain init leaves the repository issue templates alone', async () => {
    const cwd = await helpers.repo()
    await cli.data(['init', '--cwd', cwd])

    await expect(fs.readdir(path.join(cwd, IssueForm.dir))).rejects.toThrow()
  })
})
