import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { parse } from 'yaml'
import * as Config from '../src/Config.js'
import * as Store from '../src/Store.js'
import { github } from '../test/github.js'

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

async function git(args: readonly string[], cwd: string): Promise<string> {
  const { stdout } = await exec('git', [...args], { cwd })
  return stdout.trim()
}

async function main(): Promise<void> {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'frog-action-e2e-'))

  try {
    const cwd = path.join(temp, 'repo')
    const remote = path.join(temp, 'remote.git')
    const output = path.join(temp, 'output')
    const event = path.join(temp, 'event.json')
    const command = path.join(temp, 'frog')

    await fs.mkdir(cwd)
    await git(['init', '--bare', '--initial-branch=main', remote], temp)
    await git(['init', '--initial-branch=main'], cwd)
    await git(['config', 'user.name', 'Initial User'], cwd)
    await git(['config', 'user.email', 'initial@example.com'], cwd)
    await git(['remote', 'add', 'origin', remote], cwd)

    await fs.mkdir(path.join(cwd, path.dirname(Config.file)), { recursive: true })
    await fs.writeFile(
      path.join(cwd, Config.file),
      `${JSON.stringify({ repo: 'wevm/demo' }, null, 2)}\n`,
      'utf8',
    )
    await Store.write(
      {
        body: 'The action should file this entry and push its issue link.',
        severity: 'minor',
        title: 'Action end to end',
      },
      { id: 'action-end-to-end', root: cwd },
    )
    await git(['add', '--all'], cwd)
    await git(['commit', '--message', 'log friction'], cwd)
    const initial = await git(['rev-parse', 'HEAD'], cwd)
    await git(['push', '--set-upstream', 'origin', 'main'], cwd)

    const built = path.join(root, 'dist', 'bin.js')
    await fs.access(built)
    await fs.writeFile(command, `#!/usr/bin/env bash\nexec node "${built}" "$@"\n`, {
      mode: 0o755,
    })
    await fs.writeFile(event, `${JSON.stringify({ repository: { default_branch: 'main' } })}\n`)

    const action = parse(
      await fs.readFile(path.join(root, 'action', 'action.yml'), 'utf8'),
    ) as Action
    const script = action.runs?.steps?.find((step) => step.id === 'frog')?.run
    if (!script) throw new Error('Could not find the Frog action shell step.')

    const instance = await github()
    const environment = {
      ...process.env,
      FROG_INPUT_BRANCH: 'frog/sync',
      FROG_INPUT_COMMAND: command,
      FROG_INPUT_COMMIT: 'true',
      FROG_INPUT_CWD: '.',
      FROG_INPUT_DRY_RUN: 'false',
      FROG_INPUT_GIT_EMAIL: '41898282+github-actions[bot]@users.noreply.github.com',
      FROG_INPUT_GIT_NAME: 'github-actions[bot]',
      FROG_INPUT_MAX: '',
      FROG_INPUT_PUSH: 'direct',
      FROG_INPUT_REMOTE: 'origin',
      FROG_INPUT_TOKEN: 'test-token',
      FROG_INPUT_VERSION: '1',
      GITHUB_API_URL: instance.url,
      GITHUB_EVENT_PATH: event,
      GITHUB_OUTPUT: output,
      GITHUB_REPOSITORY: 'wevm/demo',
      GITHUB_SERVER_URL: 'https://github.com',
      GITHUB_TOKEN: 'test-token',
      GITHUB_WORKSPACE: cwd,
      GH_TOKEN: 'test-token',
      RUNNER_TEMP: temp,
    }
    await exec('bash', ['-c', script], {
      cwd,
      env: environment,
    })

    const log = await git(['--git-dir', remote, 'log', '--format=%s', 'main'], temp)
    if (!log.split('\n').includes('chore: sync friction log'))
      throw new Error("The remote does not contain Frog's sync commit.")

    const entry = await git(
      ['--git-dir', remote, 'show', `main:${Store.toPath('action-end-to-end')}`],
      temp,
    )
    if (!entry.includes("issue: 'wevm/demo#1'"))
      throw new Error('The pushed entry does not contain its issue link.')

    const outputs = await fs.readFile(output, 'utf8')
    if (!outputs.includes('created=1'))
      throw new Error('The action did not report one created issue.')

    // A close followed by a reopen can leave no local diff. Reset the same-repository review branch
    // anyway, without mistaking a fork's identically named branch for it.
    await git(['push', 'origin', `${initial}:refs/heads/frog/sync`], cwd)
    const bin = path.join(temp, 'bin')
    await fs.mkdir(bin)
    await fs.writeFile(
      path.join(bin, 'gh'),
      `#!/usr/bin/env bash
if [[ "$1" == 'pr' && "$2" == 'list' ]]; then
  printf '%s\\n' '[
    {
      "headRepository": { "nameWithOwner": "someone/frog" },
      "headRepositoryOwner": { "login": "someone" },
      "number": 41
    },
    {
      "headRepository": { "nameWithOwner": "wevm/demo" },
      "headRepositoryOwner": { "login": "wevm" },
      "number": 42
    }
  ]'
  exit 0
fi
if [[ "$1" == 'pr' && "$2" == 'edit' && "$3" == '42' ]]; then exit 0; fi
exit 70
`,
      { mode: 0o755 },
    )
    await exec('bash', ['-c', script], {
      cwd,
      env: {
        ...environment,
        FROG_INPUT_PUSH: 'pull-request',
        PATH: `${bin}:${process.env['PATH'] ?? ''}`,
      },
    })

    const main = await git(['--git-dir', remote, 'rev-parse', 'refs/heads/main'], temp)
    const reviewed = await git(['--git-dir', remote, 'rev-parse', 'refs/heads/frog/sync'], temp)
    if (reviewed !== main) throw new Error('The action left a stale review branch unchanged.')

    // A leftover branch without an open pull request is inert until Frog makes a new commit.
    await fs.writeFile(
      path.join(bin, 'gh'),
      "#!/usr/bin/env bash\nif [[ \"$1\" == 'pr' && \"$2\" == 'list' ]]; then echo '[]'; exit 0; fi\nexit 70\n",
      { mode: 0o755 },
    )
    await exec('bash', ['-c', script], {
      cwd,
      env: {
        ...environment,
        FROG_INPUT_PUSH: 'pull-request',
        PATH: `${bin}:${process.env['PATH'] ?? ''}`,
      },
    })

    let rejected = false
    try {
      await exec('bash', ['-c', script], {
        cwd,
        env: {
          ...environment,
          FROG_INPUT_BRANCH: 'main',
          FROG_INPUT_PUSH: 'pull-request',
          PATH: `${bin}:${process.env['PATH'] ?? ''}`,
        },
      })
    } catch {
      rejected = true
    }
    if (!rejected) throw new Error('The action allowed its review branch to replace the default.')

    console.log('pass: action filed, committed, and pushed a friction entry')
  } finally {
    await fs.rm(temp, { force: true, recursive: true })
  }
}

void main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error)
    process.exit(1)
  },
)
