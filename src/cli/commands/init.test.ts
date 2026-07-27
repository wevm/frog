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

  // Automation changes repository access or workflows, so init leaves that choice to the user.
  const { envelope } = await cli.run(['init', '--cwd', await helpers.repo()])
  const cta = envelope.meta?.['cta'] as
    | {
        commands?: { command?: string; description?: string }[]
        description?: string
      }
    | undefined
  expect(cta?.description).toMatchInlineSnapshot(`
    "Prompt the user to choose the GitHub App or Action-only setup described in \`.agents/friction-log/README.md\`. Do not install the App or add a workflow before they answer.

    Add this to \`AGENTS.md\` under the appropriate section:

    - Log papercuts and friction (tooling, docs, APIs, tests, conventions) as you hit them with \`frog log\`.
    - Do not add global, system, or internal friction.
    - Run \`frog list\` first to see what is already known.

    Then:"
  `)
  expect(cta?.commands?.[0]).toEqual({
    command: 'frog log',
    description: 'Write the first entry',
  })
  const readme = await fs.readFile(path.join(cwd, path.dirname(Config.file), 'README.md'), 'utf8')
  expect(readme).toContain('## Choose Automation')
  expect(readme).toContain('Prompt the user to choose one automation method')
  expect(readme).toContain('Choose one method per repository')
  expect(readme).toContain('| Scope | Cross-repository reporting')
  expect(readme).toContain('Choose **Action-only**')
  expect(readme).toContain('### GitHub App')
  expect(readme).toContain('### Action-only')
  expect(readme).toContain('Create `.github/workflows/frog.yml`')
  expect(readme).toContain('uses: wevm/frog/action@v1')

  // The scaffolded config must validate against the schema it advertises.
  expect(await Config.resolve({ root: cwd })).toEqual(Config.from({}))
  await expect(fs.readFile(path.join(cwd, '.github/workflows/frog.yml'))).rejects.toThrow()
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

test('behavior: leaves the automation choice alone', async () => {
  const cwd = await helpers.repo()
  const workflow = path.join(cwd, '.github/workflows/frog.yml')
  await fs.mkdir(path.dirname(workflow), { recursive: true })
  await fs.writeFile(workflow, 'custom\n', 'utf8')

  await cli.data(['init', '--cwd', cwd])

  expect(await fs.readFile(workflow, 'utf8')).toBe('custom\n')
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
