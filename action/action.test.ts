import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { parse } from 'yaml'
import * as helpers from '../test/helpers.js'

const exec = promisify(execFile)
const root = path.join(import.meta.dirname, '..')

type Action = {
  runs?: {
    steps?: readonly {
      id?: string | undefined
      run?: string | undefined
    }[]
  }
}

function envelope(options: { committed: boolean; deferred: boolean }): string {
  return JSON.stringify({
    data: {
      cleared: [],
      commented: [],
      committed: options.committed,
      created: [],
      deferred: options.deferred ? [{ id: 'deferred' }] : [],
      removed: [],
      reopened: [],
      updated: [],
    },
    ok: true,
  })
}

async function setup(): Promise<setup.Result> {
  const temp = await helpers.tmpdir()
  const remote = path.join(temp, 'remote.git')
  await helpers.git(['init', '--bare', '--initial-branch=main', remote], temp)

  const cwd = await helpers.repo({ remote })
  await helpers.writeFile('state.txt', 'main\n', cwd)
  await helpers.commit('initial', cwd)
  await helpers.git(['push', '--set-upstream', 'origin', 'main'], cwd)
  const main = await helpers.git(['rev-parse', 'HEAD'], cwd)

  await helpers.git(['switch', '--create', 'frog/sync'], cwd)
  await helpers.writeFile('queued.txt', 'queued\n', cwd)
  const queued = await helpers.commit('queued change', cwd)
  await helpers.git(['push', 'origin', 'frog/sync'], cwd)
  await helpers.git(['switch', 'main'], cwd)

  const bin = path.join(temp, 'bin')
  const command = path.join(bin, 'frog')
  const event = path.join(temp, 'event.json')
  const log = path.join(temp, 'gh.log')
  const output = path.join(temp, 'output')
  await fs.mkdir(bin)
  await fs.writeFile(
    command,
    `#!/usr/bin/env bash
if [[ -n "$FROG_EXPECT_AUTHOR" ]]; then
  if [[ " $* " != *" --expected-author $FROG_EXPECT_AUTHOR "* ]]; then exit 64; fi
elif [[ " $* " == *" --expected-author "* ]]; then
  exit 65
fi
if [[ "$1" == "$FROG_TEST_COMMIT" ]]; then
  printf '%s\\n' "$1" >> "$GITHUB_WORKSPACE/action-change.txt"
  git -C "$GITHUB_WORKSPACE" add action-change.txt
  git -C "$GITHUB_WORKSPACE" commit --message "frog $1" >/dev/null
fi
if [[ "$1" == 'publish' ]]; then
  printf '%s\\n' "$PUBLISH_OUTPUT"
  exit "$PUBLISH_STATUS"
else
  printf '%s\\n' "$SYNC_OUTPUT"
  exit "$SYNC_STATUS"
fi
`,
    { mode: 0o755 },
  )
  await fs.writeFile(
    path.join(bin, 'gh'),
    `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$GH_LOG"
if [[ "$1" == 'pr' && "$2" == 'list' ]]; then
  printf '%s\\n' '[{"headRepository":{"nameWithOwner":"wevm/demo"},"headRepositoryOwner":{"login":"wevm"},"number":42}]'
  exit 0
fi
if [[ "$1" == 'pr' && "$2" == 'edit' && "$3" == '42' ]]; then exit 0; fi
exit 70
`,
    { mode: 0o755 },
  )
  await fs.writeFile(event, `${JSON.stringify({ repository: { default_branch: 'main' } })}\n`)

  return { bin, command, cwd, event, log, main, output, queued, remote, temp }
}

declare namespace setup {
  type Result = {
    bin: string
    command: string
    cwd: string
    event: string
    log: string
    main: string
    output: string
    queued: string
    remote: string
    temp: string
  }
}

async function run(
  fixture: setup.Result,
  options: {
    commit: '' | 'publish' | 'sync'
    eventAuthor?: string | undefined
    issueAuthor?: string | undefined
    publish: string
    publishStatus?: '0' | '1' | undefined
    sync: string
    syncStatus?: '0' | '1' | undefined
  },
): Promise<void> {
  const action = parse(await fs.readFile(path.join(root, 'action', 'action.yml'), 'utf8')) as Action
  const script = action.runs?.steps?.find((step) => step.id === 'frog')?.run
  if (!script) throw new Error('Could not find the Frog action shell step.')
  const issueAuthor = options.issueAuthor ?? 'github-actions[bot]'
  if (options.eventAuthor)
    await fs.writeFile(
      fixture.event,
      `${JSON.stringify({
        issue: { user: { login: options.eventAuthor } },
        repository: { default_branch: 'main' },
      })}\n`,
    )

  await exec('bash', ['-c', script], {
    cwd: fixture.cwd,
    env: {
      ...process.env,
      FROG_INPUT_BRANCH: 'frog/sync',
      FROG_INPUT_COMMAND: fixture.command,
      FROG_INPUT_COMMIT: 'true',
      FROG_INPUT_CWD: '.',
      FROG_INPUT_DRY_RUN: 'false',
      FROG_INPUT_GIT_EMAIL: '41898282+github-actions[bot]@users.noreply.github.com',
      FROG_INPUT_GIT_NAME: 'github-actions[bot]',
      FROG_INPUT_ISSUE_AUTHOR: issueAuthor,
      FROG_INPUT_MAX: '',
      FROG_INPUT_PUSH: 'pull-request',
      FROG_INPUT_REMOTE: 'origin',
      FROG_INPUT_TOKEN: 'test-token',
      FROG_INPUT_VERSION: '1',
      FROG_EXPECT_AUTHOR: issueAuthor,
      FROG_TEST_COMMIT: options.commit,
      GH_LOG: fixture.log,
      GITHUB_EVENT_PATH: fixture.event,
      GITHUB_EVENT_NAME: options.eventAuthor ? 'issues' : 'push',
      GITHUB_OUTPUT: fixture.output,
      GITHUB_REPOSITORY: 'wevm/demo',
      GITHUB_SERVER_URL: 'https://github.com',
      GITHUB_TOKEN: 'test-token',
      GITHUB_WORKSPACE: fixture.cwd,
      GH_TOKEN: 'test-token',
      PATH: `${fixture.bin}:${process.env['PATH'] ?? ''}`,
      PUBLISH_OUTPUT: options.publish,
      PUBLISH_STATUS: options.publishStatus ?? '0',
      RUNNER_TEMP: fixture.temp,
      SYNC_OUTPUT: options.sync,
      SYNC_STATUS: options.syncStatus ?? '0',
    },
  })
}

for (const command of ['publish', 'sync'] as const)
  test(`behavior: preserves queued changes when ${command} defers`, async () => {
    const fixture = await setup()
    await run(fixture, {
      commit: command,
      publish: envelope({ committed: command === 'publish', deferred: command === 'publish' }),
      sync: envelope({ committed: command === 'sync', deferred: command === 'sync' }),
    })

    expect(
      await helpers.git(
        ['--git-dir', fixture.remote, 'rev-parse', 'refs/heads/frog/sync'],
        fixture.temp,
      ),
    ).toBe(fixture.queued)
    expect(await fs.readFile(fixture.output, 'utf8')).toContain(`${command}-deferred=1`)
    expect(await fs.readFile(fixture.log, 'utf8')).not.toContain('pr edit')
  })

test('behavior: preserves queued changes when a no-commit run defers', async () => {
  const fixture = await setup()
  await run(fixture, {
    commit: '',
    publish: envelope({ committed: false, deferred: false }),
    sync: envelope({ committed: false, deferred: true }),
  })

  expect(
    await helpers.git(
      ['--git-dir', fixture.remote, 'rev-parse', 'refs/heads/frog/sync'],
      fixture.temp,
    ),
  ).toBe(fixture.queued)
  expect(await fs.readFile(fixture.log, 'utf8')).not.toContain('pr edit')
})

test('behavior: preserves queued changes when a later command fails', async () => {
  const fixture = await setup()
  await expect(
    run(fixture, {
      commit: 'publish',
      publish: envelope({ committed: true, deferred: false }),
      sync: JSON.stringify({ error: { code: 'FAILED', message: 'Failed.' }, ok: false }),
      syncStatus: '1',
    }),
  ).rejects.toThrow()

  expect(
    await helpers.git(
      ['--git-dir', fixture.remote, 'rev-parse', 'refs/heads/frog/sync'],
      fixture.temp,
    ),
  ).toBe(fixture.queued)
  expect(await fs.readFile(fixture.log, 'utf8')).not.toContain('pr edit')
})

test('behavior: resets an existing review branch after a complete run', async () => {
  const fixture = await setup()
  await run(fixture, {
    commit: '',
    publish: envelope({ committed: false, deferred: false }),
    sync: envelope({ committed: false, deferred: false }),
  })

  expect(
    await helpers.git(
      ['--git-dir', fixture.remote, 'rev-parse', 'refs/heads/frog/sync'],
      fixture.temp,
    ),
  ).toBe(fixture.main)
  expect(await fs.readFile(fixture.log, 'utf8')).toContain('pr edit 42')
})

test('security: accepts an explicit custom-token author', async () => {
  const fixture = await setup()
  await run(fixture, {
    commit: '',
    issueAuthor: 'custom-app[bot]',
    publish: envelope({ committed: false, deferred: false }),
    sync: envelope({ committed: false, deferred: false }),
  })

  expect(
    await helpers.git(
      ['--git-dir', fixture.remote, 'rev-parse', 'refs/heads/frog/sync'],
      fixture.temp,
    ),
  ).toBe(fixture.main)
})

test('security: ignores issue events from another author', async () => {
  const fixture = await setup()
  await run(fixture, {
    commit: '',
    eventAuthor: 'attacker',
    publish: envelope({ committed: false, deferred: false }),
    sync: envelope({ committed: false, deferred: false }),
  })

  expect(
    await helpers.git(
      ['--git-dir', fixture.remote, 'rev-parse', 'refs/heads/frog/sync'],
      fixture.temp,
    ),
  ).toBe(fixture.queued)
  await expect(fs.readFile(fixture.output, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
})
