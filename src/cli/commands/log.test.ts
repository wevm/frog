import { execFileSync } from 'node:child_process'
import path from 'node:path'
import * as cli from '../../../test/cli.js'
import { github } from '../../../test/github.js'
import * as helpers from '../../../test/helpers.js'
import * as Config from '../../Config.js'
import * as Store from '../../Store.js'

const title = '`pnpm test -- <files>` ignores file filters'
const body = '## Description\n\nThe filter was swallowed.'

type Logged = { file: string; id: string; title: string }

test('behavior: writes an entry', async () => {
  const cwd = await helpers.repo()
  const result = await cli.data<Logged>(['log', title, '--body', body, '--cwd', cwd])

  expect(result.title).toBe(title)
  expect(result.file).toBe(`.agents/friction-log/${result.id}.md`)

  expect(await Store.get(result.id, { root: cwd })).toMatchObject({
    body,
    severity: 'minor',
    title,
  })
})

test('behavior: records severity, target, and labels', async () => {
  const cwd = await helpers.repo()
  const { id } = await cli.data<Logged>([
    'log',
    title,
    '--body',
    body,
    '--severity',
    'blocker',
    '--target',
    'viem',
    '--label',
    'tooling',
    '--label',
    'tests',
    '--cwd',
    cwd,
  ])

  expect(await Store.get(id, { root: cwd })).toMatchObject({
    labels: ['tooling', 'tests'],
    severity: 'blocker',
    target: 'viem',
  })
})

test('error: a title is required', async () => {
  const cwd = await helpers.repo()
  expect(await cli.error(['log', '--body', body, '--cwd', cwd])).toMatchInlineSnapshot(`
    {
      "code": "MISSING_TITLE",
      "message": "A title is required.",
    }
  `)
})

test('error: a body is required when not interactive', async () => {
  const cwd = await helpers.repo()
  expect(await cli.error(['log', title, '--cwd', cwd])).toMatchInlineSnapshot(`
    {
      "code": "MISSING_BODY",
      "message": "A body is required. An entry with no detail is not actionable.",
    }
  `)
})

test('error: an unknown severity is rejected before anything is written', async () => {
  const cwd = await helpers.repo()
  const result = await cli.error([
    'log',
    title,
    '--body',
    body,
    '--severity',
    'catastrophic',
    '--cwd',
    cwd,
  ])

  expect(result.code).toBe('VALIDATION_ERROR')
  expect(await Store.list({ root: cwd })).toEqual([])
})

describe('--publish', () => {
  const repo = 'wevm/demo'
  const remote = `git@github.com:${repo}.git`

  test('behavior: files the issue in the same command', async () => {
    const cwd = await helpers.repo({ remote })
    const instance = await github()

    const result = await cli.data<Logged & { issue?: string }>(
      ['log', title, '--body', body, '--publish', '--cwd', cwd],
      { GITHUB_API_URL: instance.url, GITHUB_TOKEN: 'test-token' },
    )

    expect(result.issue).toBe(`${repo}#1`)
    expect((await Store.get(result.id, { root: cwd })).issue).toBe(`${repo}#1`)
    expect(instance.issues.get(repo)?.[0]?.title).toBe(title)
  })

  test('behavior: publishOnLog config makes it the default', async () => {
    const cwd = await helpers.repo({ remote })
    const instance = await github()
    await helpers.writeFile(Config.file, JSON.stringify({ publishOnLog: true }), cwd)

    const result = await cli.data<Logged & { issue?: string }>(
      ['log', title, '--body', body, '--cwd', cwd],
      { GITHUB_API_URL: instance.url, GITHUB_TOKEN: 'test-token' },
    )

    expect(result.issue).toBe(`${repo}#1`)
  })

  test('behavior: --no-publish opts out of the config default', async () => {
    const cwd = await helpers.repo({ remote })
    const instance = await github()
    await helpers.writeFile(Config.file, JSON.stringify({ publishOnLog: true }), cwd)

    const result = await cli.data<Logged & { issue?: string }>(
      ['log', title, '--body', body, '--no-publish', '--cwd', cwd],
      { GITHUB_API_URL: instance.url, GITHUB_TOKEN: 'test-token' },
    )

    expect(result.issue).toBeUndefined()
    expect(instance.issues.get(repo)).toBeUndefined()
  })

  // Filing sits in the hot path of an agent's work, so it must never cost the entry.
  test('behavior: keeps the entry when filing cannot happen', async () => {
    const cwd = await helpers.repo({ remote })
    await helpers.withoutGh()

    const result = await cli.data<Logged & { unfiled?: string }>(
      ['log', title, '--body', body, '--publish', '--cwd', cwd],
      {},
    )

    expect(result.unfiled).toBe('No GitHub token found.')
    expect(await Store.get(result.id, { root: cwd })).toMatchObject({ body, title })
    expect((await Store.get(result.id, { root: cwd })).issue).toBeUndefined()
  })

  test('behavior: does not commit', async () => {
    const cwd = await helpers.repo({ remote })
    const instance = await github()
    await helpers.writeFile('a.txt', 'a', cwd)
    await helpers.commit('init', cwd)

    await cli.data<Logged>(['log', title, '--body', body, '--publish', '--cwd', cwd], {
      GITHUB_API_URL: instance.url,
      GITHUB_TOKEN: 'test-token',
    })

    expect(await helpers.git(['log', '-1', '--format=%s'], cwd)).toBe('init')
    expect(await helpers.git(['status', '--porcelain', '--untracked-files=all'], cwd)).toContain(
      '.agents/friction-log/',
    )
  })
})

describe('duplicates', () => {
  // The failure this exists to prevent: a flat friction log recorded the same Docker subnet
  // exhaustion five times, because nothing checked.
  test('error: refuses a differently-punctuated repeat', async () => {
    const cwd = await helpers.repo()
    const { id } = await cli.data<Logged>([
      'log',
      'pnpm test ignores filters',
      '--body',
      body,
      '--cwd',
      cwd,
    ])

    const result = await cli.error([
      'log',
      '  PNPM   test ignores filters!  ',
      '--body',
      body,
      '--cwd',
      cwd,
    ])

    expect(result.code).toBe('DUPLICATE_FRICTION')
    expect(result.message).toBe(`\`${id}\` already records this.`)
    expect(await Store.list({ root: cwd })).toEqual([id])
  })

  test('behavior: --force logs it anyway', async () => {
    const cwd = await helpers.repo()
    await cli.data(['log', title, '--body', body, '--cwd', cwd])
    await cli.data(['log', title, '--body', body, '--force', '--cwd', cwd])

    expect(await Store.list({ root: cwd })).toHaveLength(2)
  })

  test('behavior: a genuinely different title is allowed', async () => {
    const cwd = await helpers.repo()
    await cli.data(['log', 'pnpm test ignores filters', '--body', body, '--cwd', cwd])
    await cli.data(['log', 'pnpm build ignores filters', '--body', body, '--cwd', cwd])

    expect(await Store.list({ root: cwd })).toHaveLength(2)
  })
})

// Piping needs a process boundary, so these run the real binary rather than `cli.serve`.
describe('piped input', () => {
  const root = path.join(import.meta.dirname, '../../..')

  type Result = { code?: string; id?: string; title?: string }

  function run(cwd: string, input?: string): Result {
    try {
      const stdout = execFileSync(
        'node',
        ['--import', 'tsx', 'src/bin.ts', 'log', '--cwd', cwd, '--json'],
        {
          cwd: root,
          encoding: 'utf8',
          // Without input, standard input is `/dev/null`: a character device, which is what an agent
          // shell hands over. An inherited pipe with no writer would hang instead.
          ...(input === undefined ? { stdio: ['ignore', 'pipe', 'pipe'] } : { input }),
        },
      )
      return JSON.parse(stdout) as Result
    } catch (error) {
      return JSON.parse((error as { stdout?: string }).stdout ?? '{}') as Result
    }
  }

  test('behavior: a piped entry needs no flags at all', async () => {
    const cwd = await helpers.repo()

    const result = run(cwd, 'Filters ignored\n\n## Description\n\nThe `--` is swallowed.\n')

    expect(result.title).toBe('Filters ignored')
    expect(await Store.get(String(result.id), { root: cwd })).toMatchObject({
      body: '## Description\n\nThe `--` is swallowed.',
      severity: 'minor',
      title: 'Filters ignored',
    })
  })

  // The reason piping exists: an apostrophe ends a single-quoted `--body` and breaks the invocation.
  test('behavior: apostrophes and backticks survive', async () => {
    const cwd = await helpers.repo()

    const result = run(cwd, "`pnpm test` doesn't filter\n\nIt didn't warn either.\n")

    expect(await Store.get(String(result.id), { root: cwd })).toMatchObject({
      body: "It didn't warn either.",
      title: "`pnpm test` doesn't filter",
    })
  })

  // A hang here would be invisible in the rest of the suite, where nothing is ever piped.
  test('behavior: nothing piped and no terminal reports rather than waiting', async () => {
    const cwd = await helpers.repo()

    expect(run(cwd).code).toBe('MISSING_TITLE')
    expect(await Store.list({ root: cwd })).toEqual([])
  })
})
