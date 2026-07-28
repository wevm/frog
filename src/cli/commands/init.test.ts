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

  expect(await cli.data(['init', '--no-global', '--cwd', cwd])).toMatchInlineSnapshot(`
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
  const { envelope } = await cli.run(['init', '--no-global', '--cwd', await helpers.repo()])
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

test('behavior: the issue form scaffolds local entries', async () => {
  const cwd = await helpers.repo()
  await cli.data(['init', '--no-global', '--cwd', cwd])

  const contents = await fs.readFile(path.join(cwd, IssueForm.dir, IssueForm.filename), 'utf8')
  const form = IssueForm.parse(contents)
  if (!form) throw new Error('Expected a valid friction issue form.')

  const { id } = await cli.data<{ id: string }>(['log', 'A papercut', '--cwd', cwd])

  expect((await Store.get(id, { root: cwd })).body).toBe(IssueForm.scaffold(form).trim())
})

test('behavior: re-running never clobbers local edits', async () => {
  const cwd = await helpers.repo()
  await cli.data(['init', '--no-global', '--cwd', cwd])
  await fs.writeFile(path.join(cwd, Config.file), '{ "maxPerRun": 3 }', 'utf8')

  expect(await cli.data(['init', '--no-global', '--cwd', cwd])).toMatchObject({
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

  await cli.data(['init', '--no-global', '--cwd', cwd])

  expect(await fs.readFile(workflow, 'utf8')).toBe('custom\n')
})

test('behavior: never clobbers an existing friction issue form', async () => {
  const cwd = await helpers.repo()
  const file = path.join(cwd, IssueForm.dir, IssueForm.filename)
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, 'custom\n', 'utf8')

  const result = await cli.data<{ existing: string[] }>(['init', '--no-global', '--cwd', cwd])

  expect(result.existing).toContain('.github/ISSUE_TEMPLATE/friction.yml')
  expect(await fs.readFile(file, 'utf8')).toBe('custom\n')
})

describe('--no-inbound', () => {
  test('behavior: disables friction reported by other repositories', async () => {
    const cwd = await helpers.repo()

    await cli.data(['init', '--no-global', '--no-inbound', '--cwd', cwd])

    expect((await Config.resolve({ root: cwd })).inbound.enabled).toBe(false)
  })
})

describe('global installation', () => {
  test.each([
    ['npm@11.0.0', 'npm', ['install', '--global', 'frog']],
    ['pnpm@11.0.0', 'pnpm', ['add', '--global', 'frog']],
    ['bun@1.2.0', 'bun', ['add', '--global', 'frog']],
    ['yarn@1.22.22', 'yarn', ['global', 'add', 'frog']],
    ['yarn@4.9.2', 'npm', ['install', '--global', 'frog']],
  ])('behavior: installs with %s before scaffolding', async (value, executable, args) => {
    const cwd = await helpers.repo()
    const command = await helpers.fakeCommand(executable)
    const manifest = `${JSON.stringify({ packageManager: value }, null, 2)}\n`
    await helpers.writeFile('package.json', manifest, cwd)

    await cli.data(['init', '--cwd', cwd], { PATH: command.bin })

    expect(await command.calls()).toEqual([{ args, cwd }])
    expect(await fs.readFile(path.join(cwd, 'package.json'), 'utf8')).toBe(manifest)
    await expect(fs.stat(path.join(cwd, 'node_modules'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  test('behavior: resolves package-manager metadata from the repository root', async () => {
    const cwd = await helpers.repo()
    const nested = path.join(cwd, 'packages/app')
    const command = await helpers.fakeCommand('pnpm')
    await helpers.writeFile('package.json', '{"packageManager":"pnpm@11.0.0"}\n', cwd)
    await fs.mkdir(nested, { recursive: true })

    await cli.data(['init', '--cwd', nested], { PATH: command.bin })

    expect(await command.calls()).toEqual([{ args: ['add', '--global', 'frog'], cwd }])
  })

  test('behavior: falls back to the invoking package manager', async () => {
    const cwd = await helpers.repo()
    const command = await helpers.fakeCommand('pnpm')

    await cli.data(['init', '--cwd', cwd], {
      PATH: command.bin,
      npm_config_user_agent: 'pnpm/11.0.0 npm/? node/v24',
    })

    expect(await command.calls()).toEqual([{ args: ['add', '--global', 'frog'], cwd }])
  })

  test('behavior: --no-global skips package-manager resolution and installation', async () => {
    const cwd = await helpers.repo()
    const bin = await helpers.tmpdir()
    await helpers.writeFile('package.json', '{"packageManager":"pnpm@11.0.0"}\n', cwd)

    expect(await cli.data(['init', '--no-global', '--cwd', cwd], { PATH: bin })).toMatchObject({
      created: expect.any(Array),
      existing: [],
    })
  })

  test('behavior: an install failure leaves the repository untouched', async () => {
    const cwd = await helpers.repo()
    const command = await helpers.fakeCommand('npm', { exitCode: 17 })

    expect(
      await cli.error(['init', '--cwd', cwd], {
        PATH: command.bin,
        npm_config_user_agent: 'npm/11.0.0 node/v24',
      }),
    ).toEqual({
      code: 'INSTALL_FAILED',
      message:
        'Failed to install Frog globally: `npm install --global frog` exited with code 17. ' +
        'Run the command directly for details, or rerun `npx frog init --no-global` to skip installation.',
    })
    expect(await command.calls()).toEqual([{ args: ['install', '--global', 'frog'], cwd }])
    await expect(fs.stat(path.join(cwd, Store.dir))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(fs.stat(path.join(cwd, IssueForm.dir))).rejects.toMatchObject({ code: 'ENOENT' })
  })
})
