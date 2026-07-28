import fs from 'node:fs/promises'
import path from 'node:path'
import * as cli from '../../../test/cli.js'
import * as helpers from '../../../test/helpers.js'
import * as Config from '../../Config.js'
import * as Entry from '../../Entry.js'
import * as IssueForm from '../../IssueForm.js'
import * as Store from '../../Store.js'

test('behavior: scaffolds the directory', async () => {
  const cwd = await helpers.repo()
  await fs.writeFile(path.join(cwd, 'AGENTS.md'), 'custom\n', 'utf8')

  expect(await cli.data(['init', '--cwd', cwd])).toMatchInlineSnapshot(`
    {
      "created": [
        ".agents/friction-log/README.md",
        ".agents/friction-log/config.json",
        ".github/ISSUE_TEMPLATE/friction.yml",
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
    "Frog supports two automation methods:

    - GitHub App for pull-request feedback, forks, and cross-repository reporting.
    - Action-only for same-repository automation without granting a third-party App access.

    Prompt the user to choose one before installing the App or adding a workflow. See https://github.com/wevm/frog#automation-modes for setup.

    Add these rules near the top of \`AGENTS.md\`, under the appropriate section. Create the file if missing; otherwise amend it in place, preserve all existing content, and never replace the file.

    - Log papercuts and friction (tooling, docs, APIs, tests, conventions) as you hit them with \`npx frog log\`.
    - Do not add global, system, or internal friction.
    - Run \`npx frog list\` first to see what is already known.

    Then:"
  `)
  expect(cta?.commands?.[0]).toEqual({
    command: 'npx frog log',
    description: 'Write the first entry',
  })
  const readme = await fs.readFile(path.join(cwd, path.dirname(Config.file), 'README.md'), 'utf8')
  expect(readme).not.toContain('Prompt the user to choose')
  expect(readme).not.toContain('## Choose Automation')
  expect(readme).not.toContain('## GitHub App')
  expect(readme).not.toContain('## Action-only')
  expect(readme).not.toContain('| Area | GitHub App | Action-only |')
  expect(readme).not.toContain('github.com/apps/frog-fm')
  expect(readme).not.toContain('Create `.github/workflows/friction-log.yml`')
  expect(readme).not.toContain('uses: wevm/frog/action@v1')
  expect(readme).toContain('## Logging Friction')
  expect(readme).toContain('## For Agents')
  expect(readme).toContain(
    'Create the file if missing; otherwise amend it in place, preserve all existing content, and never replace the file.',
  )
  expect(readme).toContain('npx frog list')
  expect(readme).toContain('npx frog log')
  expect(readme).not.toMatch(/(?:^|`)frog (?:list|log)/m)
  expect(await fs.readFile(path.join(cwd, 'AGENTS.md'), 'utf8')).toBe('custom\n')

  // The scaffolded config must validate against the schema it advertises.
  expect(await Config.resolve({ root: cwd })).toEqual(
    Config.from({
      inbound: {
        enabled: true,
      },
    }),
  )

  // The form and the entry scaffold are rendered from one list of sections.
  const contents = await fs.readFile(path.join(cwd, IssueForm.dir, IssueForm.filename), 'utf8')
  const form = IssueForm.parse(contents)
  expect(form?.fields.map((field) => field.label)).toEqual(
    Entry.sections.map((section) => section.label),
  )

  await expect(fs.readFile(path.join(cwd, '.github/workflows/friction-log.yml'))).rejects.toThrow()
})

test.each([
  ['pnpx frog', 'npm/11.0.0 node/v24', 'pnpm@11.15.0'],
  ['bunx frog', 'bun/1.2.0 npm/? node/v24', undefined],
])('behavior: uses the %s runner in generated guidance', async (command, userAgent, manager) => {
  const cwd = await helpers.repo()
  if (manager)
    await fs.writeFile(
      path.join(cwd, 'package.json'),
      JSON.stringify({ packageManager: manager }),
      'utf8',
    )

  const { envelope } = await cli.run(['--format', 'json', 'init', '--cwd', cwd], {
    npm_config_user_agent: userAgent,
  })
  const cta = envelope.meta?.['cta'] as
    | {
        commands?: { command?: string }[]
        description?: string
      }
    | undefined
  const readme = await fs.readFile(path.join(cwd, path.dirname(Config.file), 'README.md'), 'utf8')

  expect(cta?.commands?.[0]?.command).toBe(`${command} log`)
  expect(cta?.description).toContain(`\`${command} log\``)
  expect(cta?.description).toContain(`\`${command} list\``)
  expect(readme).toContain(`${command} list`)
  expect(readme).toContain(`${command} log`)
})

test('behavior: the issue form scaffolds local entries', async () => {
  const cwd = await helpers.repo()
  await cli.data(['init', '--cwd', cwd])

  const contents = await fs.readFile(path.join(cwd, IssueForm.dir, IssueForm.filename), 'utf8')
  const form = IssueForm.parse(contents)
  if (!form) throw new Error('Expected a valid friction issue form.')

  const { id } = await cli.data<{ id: string }>(['log', 'A papercut', '--cwd', cwd])

  expect((await Store.get(id, { root: cwd })).body).toBe(IssueForm.scaffold(form).trim())
})

test('behavior: re-running never clobbers local edits', async () => {
  const cwd = await helpers.repo()
  await cli.data(['init', '--cwd', cwd])
  await fs.writeFile(path.join(cwd, Config.file), '{ "maxPerRun": 3 }', 'utf8')

  expect(await cli.data(['init', '--cwd', cwd])).toMatchObject({
    created: [],
    existing: [
      '.agents/friction-log/README.md',
      '.agents/friction-log/config.json',
      '.github/ISSUE_TEMPLATE/friction.yml',
    ],
  })
  expect((await Config.resolve({ root: cwd })).maxPerRun).toBe(3)
})

test('behavior: leaves the automation choice alone', async () => {
  const cwd = await helpers.repo()
  const workflow = path.join(cwd, '.github/workflows/friction-log.yml')
  await fs.mkdir(path.dirname(workflow), { recursive: true })
  await fs.writeFile(workflow, 'custom\n', 'utf8')

  await cli.data(['init', '--cwd', cwd])

  expect(await fs.readFile(workflow, 'utf8')).toBe('custom\n')
})

test('behavior: never clobbers an existing friction issue form', async () => {
  const cwd = await helpers.repo()
  const file = path.join(cwd, IssueForm.dir, IssueForm.filename)
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, 'custom\n', 'utf8')

  const result = await cli.data<{ existing: string[] }>(['init', '--cwd', cwd])

  expect(result.existing).toContain('.github/ISSUE_TEMPLATE/friction.yml')
  expect(await fs.readFile(file, 'utf8')).toBe('custom\n')
})

describe('--no-inbound', () => {
  test('behavior: disables friction reported by other repositories', async () => {
    const cwd = await helpers.repo()

    await cli.data(['init', '--no-inbound', '--cwd', cwd])

    expect((await Config.resolve({ root: cwd })).inbound.enabled).toBe(false)
  })
})
