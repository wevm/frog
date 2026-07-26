import { execFileSync, spawn } from 'node:child_process'
import { closeSync, openSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
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
  expect(result.file).toBe(`.agents/friction-log/${result.id}/friction.md`)

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
          // Without input, standard input is `/dev/null`: a character device, which is one of the
          // shapes an agent hands over. The other, a pipe held open, is covered below.
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

  // A redirect hands over an `fs.ReadStream` rather than a pipe, which has a different API surface.
  // Nothing else in the suite exercises it: `input` gives a pipe.
  test('behavior: reads a redirected file', async () => {
    const cwd = await helpers.repo()
    const file = path.join(await helpers.tmpdir(), 'entry.md')
    await writeFile(file, 'From a file\n\nFile body.\n', 'utf8')

    const input = openSync(file, 'r')
    onTestFinished(() => closeSync(input))
    const stdout = execFileSync(
      'node',
      ['--import', 'tsx', 'src/bin.ts', 'log', '--cwd', cwd, '--json'],
      {
        cwd: root,
        encoding: 'utf8',
        stdio: [input, 'pipe', 'pipe'],
      },
    )

    expect((JSON.parse(stdout) as Result).title).toBe('From a file')
    expect((await Store.read({ root: cwd }))[0]?.body).toBe('File body.')
  })

  // A hang here would be invisible in the rest of the suite, where nothing is ever piped.
  test('behavior: nothing piped and no terminal reports rather than waiting', async () => {
    const cwd = await helpers.repo()

    expect(run(cwd).code).toBe('MISSING_TITLE')
    expect(await Store.list({ root: cwd })).toEqual([])
  })
})

// The shape that used to hang: a parent holding the write end open and never writing.
describe('an open stdin pipe', () => {
  /**
   * Runs the real binary as a child, holding its standard input open and writing nothing.
   *
   * This is how an agent invokes a command, and it is the shape that used to hang: a pipe stays readable
   * for as long as the parent holds the write end, so waiting for it to end waits forever.
   */
  function spawned(args: readonly string[], options: { write?: string | undefined } = {}) {
    const child = spawn('node', ['--import', 'tsx', 'src/bin.ts', ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    if (options.write !== undefined) child.stdin.end(options.write)
    onTestFinished(() => void child.kill())

    return new Promise<{ code: number | null; output: string }>((resolve, reject) => {
      let output = ''
      child.stdout.on('data', (chunk) => (output += chunk))
      child.stderr.on('data', (chunk) => (output += chunk))
      const timer = setTimeout(() => reject(new Error(`Never exited:\n${output}`)), 20_000)
      child.on('exit', (code) => {
        clearTimeout(timer)
        resolve({ code, output })
      })
    })
  }

  test('behavior: returns when the arguments already cover the entry', async () => {
    const cwd = await helpers.repo()
    const { code } = await spawned(['log', title, '--body', body, '--cwd', cwd])

    expect(code).toBe(0)
    expect((await Store.read({ root: cwd }))[0]?.title).toBe(title)
  })

  test('behavior: refuses rather than waiting when the entry is incomplete', async () => {
    const cwd = await helpers.repo()
    const { code, output } = await spawned(['log', title, '--cwd', cwd])

    expect(code).toBe(1)
    expect(output).toContain('MISSING_BODY')
  })

  // A shell pipeline gives a FIFO rather than a socket, and an idle one blocks the read itself rather
  // than merely holding the process open. Different failure, same symptom, so it needs its own case.
  test('behavior: an idle shell pipe does not block the read', async () => {
    const cwd = await helpers.repo()
    const fifo = path.join(await helpers.tmpdir(), 'pipe')
    execFileSync('mkfifo', [fifo])

    // Opened read-write so the pipe has a writer and never reaches end-of-file, which is what an idle
    // shell pipeline looks like from inside the command.
    const idle = openSync(fifo, 'r+')
    onTestFinished(() => closeSync(idle))

    const child = spawn('node', ['--import', 'tsx', 'src/bin.ts', 'log', title, '--cwd', cwd], {
      stdio: [idle, 'pipe', 'pipe'],
    })
    onTestFinished(() => void child.kill())

    const { code, output } = await new Promise<{ code: number | null; output: string }>(
      (resolve, reject) => {
        let output = ''
        child.stdout?.on('data', (chunk) => (output += chunk))
        child.stderr?.on('data', (chunk) => (output += chunk))
        const timer = setTimeout(() => reject(new Error(`Never exited:\n${output}`)), 20_000)
        child.on('exit', (code) => {
          clearTimeout(timer)
          resolve({ code, output })
        })
      },
    )

    expect(code).toBe(1)
    expect(output).toContain('MISSING_BODY')
  })

  test('behavior: still reads input the parent actually sends', async () => {
    const cwd = await helpers.repo()
    const { code } = await spawned(['log', '--cwd', cwd], { write: `${title}\n\n${body}\n` })

    expect(code).toBe(0)
    const [entry] = await Store.read({ root: cwd })
    expect(entry?.title).toBe(title)
    expect(entry?.body).toBe(body)
  })
}, 60_000)
