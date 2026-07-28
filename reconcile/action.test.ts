import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { parse } from 'yaml'
import * as helpers from '../test/helpers.js'

const exec = promisify(execFile)
const root = path.join(import.meta.dirname, '..')

vi.setConfig({ testTimeout: 20_000 })

type Action = {
  runs?: {
    steps?: readonly {
      id?: string | undefined
      run?: string | undefined
    }[]
  }
}

async function setup(): Promise<setup.Result> {
  const temp = await helpers.tmpdir()
  const remote = path.join(temp, 'remote.git')
  await helpers.git(['init', '--bare', '--initial-branch=main', remote], temp)

  const cwd = await helpers.repo({ remote })
  await helpers.writeFile(
    '.agents/friction-log/existing/friction.md',
    '---\ntitle: Existing\nseverity: minor\n---\n\nExisting.\n',
    cwd,
  )
  const main = await helpers.commit('initial', cwd)
  await helpers.git(['push', '--set-upstream', 'origin', 'main'], cwd)

  await helpers.git(['switch', '--create', 'frog/sync'], cwd)
  await helpers.writeFile(
    '.agents/friction-log/queued/friction.md',
    '---\ntitle: Queued\nseverity: minor\n---\n\nQueued.\n',
    cwd,
  )
  const queued = await helpers.commit('queued', cwd)
  await helpers.git(['push', 'origin', 'frog/sync'], cwd)
  await helpers.git(['switch', 'main'], cwd)

  await helpers.writeFile('default-race.txt', 'race\n', cwd)
  const defaultRace = await helpers.commit('default race', cwd)
  await helpers.git(['push', 'origin', 'HEAD:refs/heads/default-race'], cwd)
  await helpers.git(['reset', '--hard', main], cwd)

  await helpers.writeFile(
    '.agents/friction-log/concurrent/friction.md',
    '---\ntitle: Concurrent\nseverity: minor\n---\n\nConcurrent.\n',
    cwd,
  )
  const branchRace = await helpers.commit('branch race', cwd)
  await helpers.git(['push', 'origin', 'HEAD:refs/heads/branch-race'], cwd)
  await helpers.git(['reset', '--hard', main], cwd)
  await helpers.git(
    ['config', `url.file://${remote}.insteadOf`, 'https://github.com/wevm/demo.git'],
    cwd,
  )
  await helpers.git(['remote', 'set-url', 'origin', 'https://github.com/wevm/demo.git'], cwd)

  const bin = path.join(temp, 'bin')
  const command = path.join(bin, 'frog')
  const curlLog = path.join(temp, 'curl.log')
  const event = path.join(temp, 'event.json')
  const frogLog = path.join(temp, 'frog.log')
  const ghLog = path.join(temp, 'gh.log')
  const output = path.join(temp, 'output')
  await fs.mkdir(bin)
  await fs.writeFile(
    command,
    `#!/usr/bin/env bash
set -euo pipefail
[[ -z "\${FROG_INPUT_TOKEN:-}" ]]
[[ -z "\${ACTIONS_ID_TOKEN_REQUEST_TOKEN:-}" ]]
[[ -z "\${ACTIONS_ID_TOKEN_REQUEST_URL:-}" ]]
printf '%s\\n' "$*" >> "$FROG_LOG"
state=''
previous=''
for argument in "$@"; do
  if [[ "$previous" == '--state' ]]; then state="$argument"; fi
  previous="$argument"
done
[[ -n "$state" ]]
printf 'STATE=' >> "$FROG_LOG"
tr -d '\\n' < "$state" >> "$FROG_LOG"
printf '\\n' >> "$FROG_LOG"

case "$FROG_TEST_CHANGE" in
  create|safe|deferred|race-default|race-sync)
    mkdir -p "$GITHUB_WORKSPACE/.agents/friction-log/report"
    printf '%s\\n' '---' 'title: Report' 'severity: minor' '---' '' 'Report.' \\
      > "$GITHUB_WORKSPACE/.agents/friction-log/report/friction.md"
    ;;
  off-scope)
    mkdir -p "$GITHUB_WORKSPACE/.github/workflows"
    printf '%s\\n' 'name: unsafe' > "$GITHUB_WORKSPACE/.github/workflows/unsafe.yml"
    ;;
  symlink)
    mkdir -p "$GITHUB_WORKSPACE/.agents/friction-log/report"
    ln -s /etc/passwd "$GITHUB_WORKSPACE/.agents/friction-log/report/friction.md"
    ;;
  mode)
    mkdir -p "$GITHUB_WORKSPACE/.agents/friction-log/report"
    printf '%s\\n' 'report' > "$GITHUB_WORKSPACE/.agents/friction-log/report/friction.md"
    chmod +x "$GITHUB_WORKSPACE/.agents/friction-log/report/friction.md"
    ;;
  rename)
    mkdir -p "$GITHUB_WORKSPACE/.agents/friction-log/renamed"
    git -C "$GITHUB_WORKSPACE" mv \\
      .agents/friction-log/existing/friction.md \\
      .agents/friction-log/renamed/friction.md
    ;;
esac

if [[ "$FROG_TEST_CHANGE" == 'race-default' ]]; then
  git --git-dir="$FROG_TEST_REMOTE" update-ref refs/heads/main "$FROG_TEST_DEFAULT_RACE"
fi
if [[ "$FROG_TEST_CHANGE" == 'race-sync' ]]; then
  git --git-dir="$FROG_TEST_REMOTE" update-ref refs/heads/frog/sync "$FROG_TEST_BRANCH_RACE"
fi

if [[ "$FROG_TEST_CHANGE" == 'incomplete' ]]; then
  printf '%s\\n' '{"data":{"deferred":[{"code":"APP_STATE_INCOMPLETE","id":"report","reason":"The Frog App could not inspect every report."}]},"ok":true}'
elif [[ "$FROG_TEST_CHANGE" == 'deferred' ]]; then
  printf '%s\\n' '{"data":{"deferred":[{"code":"WAIT","id":"report","reason":"wait"}]},"ok":true}'
else
  printf '%s\\n' '{"data":{"deferred":[]},"ok":true}'
fi
`,
    { mode: 0o755 },
  )
  await fs.writeFile(
    path.join(bin, 'curl'),
    `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" >> "$CURL_LOG"
if [[ "$*" == *'token.actions.test'* ]]; then
  printf '%s\\n' '{"value":"oidc-token"}'
  exit 0
fi
output=''
previous=''
for argument in "$@"; do
  if [[ "$previous" == '--output' ]]; then output="$argument"; fi
  previous="$argument"
done
[[ -n "$output" ]]
printf '%s\\n' "$FROG_TEST_STATE" > "$output"
`,
    { mode: 0o755 },
  )
  await fs.writeFile(
    path.join(bin, 'gh'),
    `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" >> "$GH_LOG"
if [[ "$1" == 'pr' && "$2" == 'list' ]]; then
  if [[ "$FROG_TEST_CHANGE" == 'create' ]]; then
    printf '%s\\n' '[]'
    exit 0
  fi
  printf '%s\\n' '[{"headRefName":"frog/sync","headRepository":{"nameWithOwner":"wevm/demo"},"headRepositoryOwner":{"login":"wevm"},"number":42}]'
  exit 0
fi
if [[ "$1" == 'pr' && "$2" == 'edit' && "$3" == '42' ]]; then exit 0; fi
if [[ "$1" == 'pr' && "$2" == 'create' ]]; then
  printf '%s\\n' 'https://github.com/wevm/demo/pull/43'
  exit 0
fi
if [[ "$1" == 'pr' && "$2" == 'view' ]]; then
  printf '%s\\n' '{"baseRefName":"main","headRefName":"frog/sync","headRepository":{"nameWithOwner":"wevm/demo"},"headRepositoryOwner":{"login":"wevm"}}'
  exit 0
fi
exit 70
`,
    { mode: 0o755 },
  )
  await fs.writeFile(
    event,
    `${JSON.stringify({
      repository: { default_branch: 'main', full_name: 'wevm/demo', id: 123 },
    })}\n`,
  )

  return {
    bin,
    branchRace,
    command,
    curlLog,
    cwd,
    defaultRace,
    event,
    frogLog,
    ghLog,
    main,
    output,
    queued,
    remote,
    temp,
  }
}

declare namespace setup {
  type Result = {
    bin: string
    branchRace: string
    command: string
    curlLog: string
    cwd: string
    defaultRace: string
    event: string
    frogLog: string
    ghLog: string
    main: string
    output: string
    queued: string
    remote: string
    temp: string
  }
}

async function run(fixture: setup.Result, change: string): Promise<void> {
  const action = parse(
    await fs.readFile(path.join(root, 'reconcile', 'action.yml'), 'utf8'),
  ) as Action
  const script = action.runs?.steps?.find((step) => step.id === 'reconcile')?.run
  if (!script) throw new Error('Could not find the reconciliation shell step.')

  if (change === 'valid-signal' || change === 'forged-signal')
    await fs.writeFile(
      fixture.event,
      `${JSON.stringify({
        action: 'created',
        comment: {
          body:
            change === 'valid-signal'
              ? `Reconcile the friction log.\n\n<!-- frog:reconcile:v1 delivery=${'a'.repeat(64)} -->\n`
              : 'A copied <!-- frog:reconcile:v1 delivery=forged --> marker.',
          user: { id: 309546769 },
        },
        issue: {
          body:
            'Frog keeps this issue closed and uses one comment on it to request friction-log reconciliation.\n' +
            'The comment is only a wakeup signal; the workflow fetches authenticated state separately.\n\n' +
            '<!-- frog:reconcile-issue:v1 -->\n',
          title: 'Frog reconciliation',
          user: { id: 309546769 },
        },
        repository: { default_branch: 'main', full_name: 'wevm/demo', id: 123 },
      })}\n`,
    )

  await exec('bash', ['-c', script], {
    cwd: fixture.cwd,
    env: {
      ...process.env,
      ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'request-token',
      ACTIONS_ID_TOKEN_REQUEST_URL: 'https://token.actions.test/oidc?job=1',
      CURL_LOG: fixture.curlLog,
      FROG_INPUT_COMMAND: fixture.command,
      FROG_INPUT_TOKEN: 'github-token',
      FROG_INPUT_VERSION: '1',
      FROG_LOG: fixture.frogLog,
      FROG_TEST_BRANCH_RACE: fixture.branchRace,
      FROG_TEST_CHANGE: change,
      FROG_TEST_DEFAULT_RACE: fixture.defaultRace,
      FROG_TEST_REMOTE: fixture.remote,
      FROG_TEST_STATE: JSON.stringify({
        complete: change !== 'incomplete',
        reports: {},
        repository: { fullName: 'wevm/demo', id: 123, sha: fixture.main },
        version: 1,
      }),
      GH_LOG: fixture.ghLog,
      GITHUB_EVENT_PATH: fixture.event,
      GITHUB_EVENT_NAME:
        change === 'valid-signal' || change === 'forged-signal' ? 'issue_comment' : 'push',
      GITHUB_OUTPUT: fixture.output,
      GITHUB_REF: 'refs/heads/main',
      GITHUB_REPOSITORY: 'wevm/demo',
      GITHUB_SHA: fixture.main,
      GITHUB_WORKSPACE: fixture.cwd,
      PATH: `${fixture.bin}:${process.env['PATH'] ?? ''}`,
      RUNNER_TEMP: fixture.temp,
    },
  })
}

async function remoteHead(fixture: setup.Result, branch = 'frog/sync'): Promise<string> {
  return helpers.git(
    ['--git-dir', fixture.remote, 'rev-parse', `refs/heads/${branch}`],
    fixture.temp,
  )
}

async function failure(fixture: setup.Result, change: string): Promise<string> {
  try {
    await run(fixture, change)
  } catch (error) {
    const result = error as Error & { stderr?: string | undefined; stdout?: string | undefined }
    return `${result.stdout ?? ''}\n${result.stderr ?? ''}`
  }
  throw new Error('Expected reconciliation to fail.')
}

test('behavior: uses only OIDC state from the broker and updates the same-repository branch', async () => {
  const fixture = await setup()
  await run(fixture, 'safe')

  const curl = await fs.readFile(fixture.curlLog, 'utf8')
  expect(curl).toContain('audience=https%3A%2F%2Ffrog.wevm.dev%2Fgithub%2Freconcile')
  expect(curl).toContain('Authorization: Bearer oidc-token')
  expect(curl).not.toContain('github-token')
  expect(curl).not.toContain('--data')

  const frog = await fs.readFile(fixture.frogLog, 'utf8')
  expect(frog).toContain('sync --cwd')
  expect(frog).toContain('--state')
  expect(frog).toContain('--no-commit --json --full-output')
  expect(frog).not.toContain('github-token')
  expect(frog).not.toContain('publish')

  const head = await remoteHead(fixture)
  expect(head).not.toBe(fixture.queued)
  expect(await helpers.git(['diff', '--name-only', fixture.main, head], fixture.cwd)).toBe(
    '.agents/friction-log/report/friction.md',
  )
  expect(await fs.readFile(fixture.ghLog, 'utf8')).toContain('pr edit 42')
})

test('behavior: creates and verifies a same-repository pull request', async () => {
  const fixture = await setup()
  await helpers.git(['push', 'origin', '--delete', 'frog/sync'], fixture.cwd)
  await run(fixture, 'create')

  const log = await fs.readFile(fixture.ghLog, 'utf8')
  expect(log).toContain('pr create')
  expect(log).toContain('pr view https://github.com/wevm/demo/pull/43')
})

test('security: accepts only the exact App-owned reconciliation signal', async () => {
  const valid = await setup()
  await run(valid, 'valid-signal')

  const forged = await setup()
  expect(await failure(forged, 'forged-signal')).toContain(
    'The issue comment is not an exact Frog reconciliation signal.',
  )
  expect(await remoteHead(forged)).toBe(forged.queued)
})

test('behavior: leaves no branch or pull request after a complete no-op', async () => {
  const fixture = await setup()
  await helpers.git(['push', 'origin', '--delete', 'frog/sync'], fixture.cwd)
  await run(fixture, 'none')

  expect(
    await helpers.git(['ls-remote', '--heads', 'origin', 'refs/heads/frog/sync'], fixture.cwd),
  ).toBe('')
  await expect(fs.readFile(fixture.ghLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
})

test('security: rejects a path outside the friction log', async () => {
  const fixture = await setup()
  expect(await failure(fixture, 'off-scope')).toContain(
    'Frog created an untracked path outside the friction log.',
  )
  expect(await remoteHead(fixture)).toBe(fixture.queued)
})

test.each(['symlink', 'mode'])('security: rejects a %s change', async (change) => {
  const fixture = await setup()
  expect(await failure(fixture, change)).toContain('Frog produced an unsafe repository change.')
  expect(await remoteHead(fixture)).toBe(fixture.queued)
})

test('security: rejects a rename between otherwise allowed paths', async () => {
  const fixture = await setup()
  expect(await failure(fixture, 'rename')).toContain('Frog produced an unsafe repository change.')
  expect(await remoteHead(fixture)).toBe(fixture.queued)
})

test('behavior: preserves the review branch when reconciliation defers', async () => {
  const fixture = await setup()
  await run(fixture, 'deferred')
  expect(await remoteHead(fixture)).toBe(fixture.queued)
})

test('behavior: preserves the review branch for incomplete App state', async () => {
  const fixture = await setup()
  await run(fixture, 'incomplete')

  expect(await remoteHead(fixture)).toBe(fixture.queued)
  expect(await fs.readFile(fixture.output, 'utf8')).toContain('"code":"APP_STATE_INCOMPLETE"')
})

test('security: rejects a default-branch race before pushing', async () => {
  const fixture = await setup()
  expect(await failure(fixture, 'race-default')).toContain(
    'The remote default branch moved during reconciliation.',
  )
  expect(await remoteHead(fixture, 'main')).toBe(fixture.defaultRace)
  expect(await remoteHead(fixture)).toBe(fixture.queued)
})

test('security: force-with-lease preserves a concurrent review-branch update', async () => {
  const fixture = await setup()
  expect(await failure(fixture, 'race-sync')).toContain(
    'Could not update frog/sync. The remote branch changed or rejected the push.',
  )
  expect(await remoteHead(fixture)).toBe(fixture.branchRace)

  const source = await fs.readFile(path.join(root, 'reconcile', 'action.yml'), 'utf8')
  expect(source).toContain('--force-with-lease=')
  expect(source).not.toMatch(/\bpush\s+--force(?:\s|$)/)
})
