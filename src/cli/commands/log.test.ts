import { execFileSync, spawn } from 'node:child_process'
import { closeSync, openSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import * as cli from '../../../test/cli.js'
import { github } from '../../../test/github.js'
import * as helpers from '../../../test/helpers.js'
import { testPostgres } from '../../../test/postgres.js'
import * as Config from '../../Config.js'
import * as Store from '../../Store.js'

const title = '`pnpm test -- <files>` ignores file filters'
const body = '## Description\n\nThe filter was swallowed.'
const postgres = testPostgres()

test('error: immediate publishing requires the file store', async () => {
  const store = await postgres.store()
  const cwd = await helpers.repo()

  expect(
    (await cli.error(['log', title, '--body', body, '--publish', '--cwd', cwd], {}, { store }))
      .code,
  ).toBe('STORE_UNSUPPORTED_OPTION')
})

test('behavior: durable-store follow-up does not suggest repository publishing', async () => {
  const store = await postgres.store()
  const cwd = await helpers.repo()

  expect(
    (await cli.run(['log', title, '--body', body, '--cwd', cwd], {}, { store })).envelope,
  ).toMatchObject({
    meta: { cta: { commands: [{ command: 'frog list' }] } },
    ok: true,
  })
})

test('behavior: durable-store logging atomically records repeated titles', async () => {
  const store = await postgres.store()
  const cwd = await helpers.repo()

  const first = await cli.data<Logged>(['log', title, '--body', body, '--cwd', cwd], {}, { store })
  const repeated = await cli.data<Logged>(
    ['log', title.toUpperCase(), '--body', 'Later details.', '--cwd', cwd],
    {},
    { store },
  )

  expect(repeated.id).toBe(first.id)
  expect(await store.records()).toMatchObject([{ occurrences: 2 }])
})
const ownForm = [
  'name: Friction',
  'body:',
  '  - type: textarea',
  '    attributes:',
  '      label: Expected Behavior',
  '  - type: textarea',
  '    attributes:',
  '      label: Current Behavior',
  '    validations:',
  '      required: true',
  '  - type: textarea',
  '    attributes:',
  '      label: Possible Solution',
].join('\n')
const ownBody = [
  '### Expected Behavior',
  '',
  '### Current Behavior',
  '',
  'The filter was swallowed.',
  '',
  '### Possible Solution',
].join('\n')

type Logged = { file: string; id: string; title: string }

async function writeOwnForm(cwd: string, contents = ownForm, filename = 'friction.yml') {
  await helpers.writeFile(`.github/ISSUE_TEMPLATE/${filename}`, contents, cwd)
}

async function editor(body: string) {
  const file = path.join(await helpers.tmpdir(), 'editor.mjs')
  await writeFile(
    file,
    [
      "import fs from 'node:fs'",
      'const file = process.argv[2]',
      "const contents = fs.readFileSync(file, 'utf8')",
      'const frontmatter = /^---[^]*?\\n---\\n/.exec(contents)?.[0]',
      "if (!frontmatter) throw new Error('frontmatter missing')",
      `fs.writeFileSync(file, frontmatter + '\\n' + ${JSON.stringify(body)} + '\\n')`,
    ].join('\n'),
    'utf8',
  )
  return `node ${file}`
}

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

// A project that publishes a form has said how it wants friction written. That answer should hold for
// its own entries too, not only for whoever reports to it.
test('behavior: scaffolds from this repository own issue form', async () => {
  const cwd = await helpers.repo()
  await helpers.writeFile(
    '.github/ISSUE_TEMPLATE/friction.yml',
    [
      'name: Friction',
      'description: Something cost you time.',
      'body:',
      '  - type: textarea',
      '    attributes:',
      '      label: What Broke',
      '      description: The thing that cost you time.',
    ].join('\n'),
    cwd,
  )

  const { id } = await cli.data<Logged>(['log', title, '--cwd', cwd])

  expect((await Store.get(id, { root: cwd })).body).toMatchInlineSnapshot(`
    "### What Broke

    <!-- The thing that cost you time. -->"
  `)
})

test('error: a supplied body must preserve this repository own issue form', async () => {
  const cwd = await helpers.repo()
  await writeOwnForm(cwd)

  const result = await cli.error(['log', title, '--body', body, '--cwd', cwd])

  expect(result).toMatchInlineSnapshot(`
    {
      "code": "BODY_DOES_NOT_MATCH_FORM",
      "message": "Body does not match this repository's issue form. Missing or out-of-order headings: \`Expected Behavior\`, \`Current Behavior\`, \`Possible Solution\`.",
    }
  `)
  expect(await Store.list({ root: cwd })).toEqual([])
})

test('behavior: a supplied body may leave optional form sections empty', async () => {
  const cwd = await helpers.repo()
  await writeOwnForm(cwd)

  const { id } = await cli.data<Logged>(['log', title, '--body', ownBody, '--cwd', cwd])

  expect((await Store.get(id, { root: cwd })).body).toBe(ownBody)
})

test('error: an explicitly empty body must preserve this repository own issue form', async () => {
  const cwd = await helpers.repo()
  await writeOwnForm(cwd)

  const result = await cli.error(['log', title, '--body', '', '--cwd', cwd])

  expect(result.code).toBe('BODY_DOES_NOT_MATCH_FORM')
  expect(await Store.list({ root: cwd })).toEqual([])
})

test('error: an explicit self target must preserve this repository own issue form', async () => {
  const cwd = await helpers.repo({ remote: 'git@github.com:acme/app.git' })
  await writeOwnForm(cwd)

  const result = await cli.error([
    'log',
    title,
    '--body',
    body,
    '--target',
    'acme/app',
    '--cwd',
    cwd,
  ])

  expect(result.code).toBe('BODY_DOES_NOT_MATCH_FORM')
  expect(await Store.list({ root: cwd })).toEqual([])
})

test('error: a package target resolving to self must preserve this repository own issue form', async () => {
  const cwd = await helpers.repo({ remote: 'git@github.com:acme/app.git' })
  await writeOwnForm(cwd)
  await helpers.writeFile(
    'node_modules/self-package/package.json',
    JSON.stringify({ repository: 'https://github.com/acme/app.git' }),
    cwd,
  )

  const result = await cli.error([
    'log',
    title,
    '--body',
    body,
    '--target',
    'self-package',
    '--cwd',
    cwd,
  ])

  expect(result.code).toBe('BODY_DOES_NOT_MATCH_FORM')
  expect(await Store.list({ root: cwd })).toEqual([])
})

test('behavior: this repository configured issue form wins', async () => {
  const cwd = await helpers.repo()
  await writeOwnForm(
    cwd,
    'name: Default\nbody:\n  - type: textarea\n    attributes:\n      label: Default Field\n',
  )
  await writeOwnForm(
    cwd,
    [
      'name: Configured',
      'body:',
      '  - type: textarea',
      '    attributes:',
      '      label: Configured Field',
      '    validations:',
      '      required: true',
    ].join('\n'),
    'configured.yml',
  )
  await helpers.writeFile(
    Config.file,
    JSON.stringify({ inbound: { template: 'configured.yml' } }),
    cwd,
  )
  const configuredBody = '### Configured Field\n\nThe configured answer.'

  const { id } = await cli.data<Logged>(['log', title, '--body', configuredBody, '--cwd', cwd])

  expect((await Store.get(id, { root: cwd })).body).toBe(configuredBody)
})

test('error: a body broken in the editor must preserve this repository own issue form', async () => {
  const cwd = await helpers.repo()
  await writeOwnForm(cwd)

  const result = await cli.error(['log', title, '--open', '--cwd', cwd], {
    VISUAL: await editor(body),
  })

  expect(result.code).toBe('BODY_DOES_NOT_MATCH_FORM')
  expect((await Store.read({ root: cwd }))[0]?.body).toBe(body)
})

test('error: a supplied body must answer required form fields', async () => {
  const cwd = await helpers.repo()
  await helpers.writeFile(
    '.github/ISSUE_TEMPLATE/friction.yml',
    [
      'name: Friction',
      'body:',
      '  - type: checkboxes',
      '    attributes:',
      '      label: Check Existing Issues',
      '      options:',
      '        - label: I checked for an existing issue.',
      '    validations:',
      '      required: true',
      '  - type: textarea',
      '    attributes:',
      '      label: Current Behavior',
      '    validations:',
      '      required: true',
    ].join('\n'),
    cwd,
  )
  const formBody = [
    '### Check Existing Issues',
    '',
    '- [ ] I checked for an existing issue.',
    '',
    '### Current Behavior',
    '',
    '<!-- Required. -->',
  ].join('\n')

  const result = await cli.error(['log', title, '--body', formBody, '--cwd', cwd])

  expect(result).toMatchInlineSnapshot(`
    {
      "code": "BODY_DOES_NOT_MATCH_FORM",
      "message": "Body does not match this repository's issue form. Required fields without answers: \`Check Existing Issues\`, \`Current Behavior\`.",
    }
  `)
  expect(await Store.list({ root: cwd })).toEqual([])
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
      "message": "A body is required.",
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

describe('--target', () => {
  const upstream = 'wevm/viem'
  const form = [
    'name: Bug Report',
    'body:',
    '  - type: markdown',
    '    attributes:',
    '      value: Thanks for filing!',
    '  - type: input',
    '    attributes:',
    '      label: Viem Version',
    '    validations:',
    '      required: true',
    '  - type: textarea',
    '    attributes:',
    '      label: Current Behavior',
    '',
  ].join('\n')

  /** A consumer that may report upstream, and an upstream that accepts. */
  async function consumer() {
    const cwd = await helpers.repo({ remote: 'git@github.com:acme/app.git' })
    await helpers.writeFile(
      Config.file,
      JSON.stringify({ outbound: { allowedRepos: [upstream] } }),
      cwd,
    )
    return cwd
  }

  function accepting(files: Record<string, string> = {}) {
    return {
      files: {
        [upstream]: {
          [Config.file]: JSON.stringify({ inbound: { enabled: true } }),
          ...files,
        },
      },
    }
  }

  test('behavior: scaffolds the entry from the target form', async () => {
    const cwd = await consumer()
    const instance = await github({}, accepting({ '.github/ISSUE_TEMPLATE/bug_report.yml': form }))

    const { id } = await cli.data<Logged>(['log', title, '--target', upstream, '--cwd', cwd], {
      GITHUB_API_URL: instance.url,
      GITHUB_TOKEN: 'test-token',
    })

    // The upstream's questions, not Frog's sections.
    expect((await Store.get(id, { root: cwd })).body).toMatchInlineSnapshot(`
      "### Viem Version

      <!-- Required. -->

      ### Current Behavior"
    `)
  })

  test('behavior: a template named in the target config wins', async () => {
    const cwd = await consumer()
    const instance = await github(
      {},
      {
        files: {
          [upstream]: {
            [Config.file]: JSON.stringify({
              inbound: { enabled: true, template: 'friction.yml' },
            }),
            '.github/ISSUE_TEMPLATE/bug_report.yml': form,
            '.github/ISSUE_TEMPLATE/friction.yml':
              'name: Friction\nbody:\n  - type: textarea\n    attributes:\n      label: What broke\n',
          },
        },
      },
    )

    const { id } = await cli.data<Logged>(['log', title, '--target', upstream, '--cwd', cwd], {
      GITHUB_API_URL: instance.url,
      GITHUB_TOKEN: 'test-token',
    })

    expect((await Store.get(id, { root: cwd })).body).toBe('### What broke')
  })

  // A failing lookup must not throw. Without a scaffold there is simply nothing to write, which is
  // exactly where a target-less `log` already stands.
  test('error: an unreachable target asks for a body rather than failing', async () => {
    const cwd = await consumer()
    const instance = await github({}, { errors: { [upstream]: 500 } })

    const result = await cli.error(['log', title, '--target', upstream, '--cwd', cwd], {
      GITHUB_API_URL: instance.url,
      GITHUB_TOKEN: 'test-token',
    })

    expect(result.code).toBe('MISSING_BODY')
    expect(await Store.list({ root: cwd })).toEqual([])
  })

  test('error: a target with no form asks for a body', async () => {
    const cwd = await consumer()
    const instance = await github({}, accepting())

    const result = await cli.error(['log', title, '--target', upstream, '--cwd', cwd], {
      GITHUB_API_URL: instance.url,
      GITHUB_TOKEN: 'test-token',
    })

    expect(result.code).toBe('MISSING_BODY')
  })

  test('behavior: a supplied body survives an unreachable target', async () => {
    const cwd = await consumer()
    const instance = await github({}, { errors: { [upstream]: 500 } })

    const { id } = await cli.data<Logged>(
      ['log', title, '--body', body, '--target', upstream, '--cwd', cwd],
      { GITHUB_API_URL: instance.url, GITHUB_TOKEN: 'test-token' },
    )

    expect((await Store.get(id, { root: cwd })).body).toBe(body)
  })

  // Authoring is offline unless the scaffold would actually be used.
  test('behavior: a supplied body fetches nothing', async () => {
    const cwd = await consumer()
    const instance = await github({}, accepting({ '.github/ISSUE_TEMPLATE/bug_report.yml': form }))

    await cli.data<Logged>(['log', title, '--body', body, '--target', upstream, '--cwd', cwd], {
      GITHUB_API_URL: instance.url,
      GITHUB_TOKEN: 'test-token',
    })

    expect(instance.requests).toEqual([])
  })
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

  test('error: does not file an unanswered issue-form scaffold', async () => {
    const cwd = await helpers.repo({ remote })
    await writeOwnForm(cwd)
    const instance = await github()

    const result = await cli.error(['log', title, '--publish', '--cwd', cwd], {
      GITHUB_API_URL: instance.url,
      GITHUB_TOKEN: 'test-token',
    })

    expect(result.code).toBe('BODY_DOES_NOT_MATCH_FORM')
    expect(instance.issues.get(repo)).toBeUndefined()
  })

  // Filing is opt-in even when GitHub is reachable: the entry belongs in the same commit as the work,
  // and an issue filed on every `log` would publish drafts the author has not finished.
  test('behavior: files nothing unless asked', async () => {
    const cwd = await helpers.repo({ remote })
    const instance = await github()

    const result = await cli.data<Logged & { issue?: string }>(
      ['log', title, '--body', body, '--cwd', cwd],
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
