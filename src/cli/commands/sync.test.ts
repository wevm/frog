import fs from 'node:fs/promises'
import path from 'node:path'
import * as cli from '../../../test/cli.js'
import { github } from '../../../test/github.js'
import * as helpers from '../../../test/helpers.js'
import { FakePostgresClient } from '../../../test/postgres.js'
import * as AppSync from '../../AppSync.js'
import * as Entry from '../../Entry.js'
import * as Github from '../../Github.js'
import * as Mirrors from '../../Mirrors.js'
import * as PostgresStore from '../../PostgresStore.js'
import * as Store from '../../Store.js'

const repo = 'wevm/demo'
const remote = `git@github.com:${repo}.git`
const title = 'Filters ignored'

type Outcome = {
  cleared: { id: string; title: string }[]
  committed: boolean
  deferred: { code: string; id: string; reason: string }[]
  reopened: { id: string; title: string }[]
  removed: { id: string; title: string }[]
  updated: { id: string; title: string }[]
}

function env(url: string): Record<string, string> {
  return { GITHUB_API_URL: url, GITHUB_TOKEN: 'test-token' }
}

test('error: repository reconciliation requires the file store', async () => {
  const store = PostgresStore.adapter({ client: new FakePostgresClient(), namespace: 'sync-test' })
  const cwd = await helpers.repo({ remote })

  await Store.withAdapter(store, async () => {
    expect((await cli.error(['sync', '--cwd', cwd])).code).toBe('STORE_UNSUPPORTED_COMMAND')
  })
})

function issueBody(id: string, body = 'Body.', severity?: Entry.Severity): string {
  return Github.renderBody({
    body,
    marker: {
      hash: Github.hash(title),
      origin: repo,
      path: Store.toPath(id),
      ...(severity ? { severity } : {}),
    },
  })
}

/** A repository with one entry already linked to issue #1. */
async function linked(options: { state?: 'closed' | 'open' } = {}) {
  const cwd = await helpers.repo({ remote })
  await Store.write(
    { body: 'Body.', issue: `${repo}#1`, severity: 'minor', title },
    { id: 'a', root: cwd },
  )
  await helpers.commit('log friction', cwd)
  const instance = await github({
    [repo]: [{ body: issueBody('a'), state: options.state ?? 'open', title }],
  })
  return { cwd, instance }
}

test('behavior: a matching entry and issue need nothing', async () => {
  const { cwd, instance } = await linked()

  expect(await cli.data<Outcome>(['sync', '--cwd', cwd], env(instance.url))).toMatchObject({
    cleared: [],
    committed: false,
    removed: [],
    updated: [],
  })
})

test('behavior: a closed issue deletes its entry and commits', async () => {
  const { cwd, instance } = await linked({ state: 'closed' })

  const result = await cli.data<Outcome>(['sync', '--cwd', cwd], env(instance.url))

  expect(result).toMatchObject({ committed: true, removed: [{ id: 'a', title }] })
  expect(await Store.list({ root: cwd })).toEqual([])
  expect(await helpers.git(['log', '-1', '--format=%s'], cwd)).toBe('chore: sync friction log')
  expect(await helpers.git(['status', '--porcelain'], cwd)).toBe('')
})

test('security: automated reconciliation never deletes from another author issue', async () => {
  const cwd = await helpers.repo({ remote })
  await Store.write(
    { body: 'Body.', issue: `${repo}#1`, severity: 'minor', title },
    { id: 'a', root: cwd },
  )
  await helpers.commit('log friction', cwd)
  const instance = await github({
    [repo]: [{ author: 'contributor', body: issueBody('a'), state: 'closed', title }],
  })

  const result = await cli.data<Outcome>(
    ['sync', '--cwd', cwd, '--expected-author', 'github-actions[bot]'],
    env(instance.url),
  )

  expect(result.removed).toEqual([])
  expect(result.cleared).toEqual([{ id: 'a', title }])
  expect(await Store.list({ root: cwd })).toEqual(['a'])
})

test('behavior: closing takes the committed reproduction with it', async () => {
  const cwd = await helpers.repo({ remote })
  await Store.write(
    { body: 'Body.', issue: `${repo}#1`, severity: 'minor', title },
    { id: 'a', root: cwd },
  )
  await helpers.writeFile(`${Store.toArtifacts('a')}/repro.ts`, 'export {}\n', cwd)
  await helpers.commit('log friction', cwd)
  const instance = await github({
    [repo]: [{ body: issueBody('a'), state: 'closed', title }],
  })

  const result = await cli.data<Outcome>(['sync', '--cwd', cwd], env(instance.url))

  expect(result).toMatchObject({ committed: true, removed: [{ id: 'a', title }] })
  // Gone from disk and from the index: a staged artifact left behind would show up here.
  expect(await Store.files('a', { root: cwd })).toEqual([])
  expect(await helpers.git(['status', '--porcelain'], cwd)).toBe('')
  expect(await helpers.git(['ls-files', Store.dir], cwd)).toBe(Mirrors.file)
})

test('behavior: deletes an entry that was never committed', async () => {
  const cwd = await helpers.repo({ remote })
  await helpers.writeFile('a.txt', 'a', cwd)
  await helpers.commit('init', cwd)
  await Store.write(
    { body: 'Body.', issue: `${repo}#1`, severity: 'minor', title },
    { id: 'a', root: cwd },
  )
  const instance = await github({
    [repo]: [{ body: issueBody('a'), state: 'closed', title }],
  })

  expect((await cli.data<Outcome>(['sync', '--cwd', cwd], env(instance.url))).removed).toEqual([
    { id: 'a', title },
  ])
  expect(await Store.list({ root: cwd })).toEqual([])
})

test('behavior: an edited issue rewrites the entry', async () => {
  const cwd = await helpers.repo({ remote })
  await Store.write(
    { body: 'Body.', issue: `${repo}#1`, severity: 'minor', title },
    { id: 'a', root: cwd },
  )
  const instance = await github({
    [repo]: [
      { body: issueBody('a', 'Rewritten by a maintainer.'), title: 'Renamed by a maintainer' },
    ],
  })

  const result = await cli.data<Outcome>(['sync', '--cwd', cwd], env(instance.url))
  expect(result.reopened).toEqual([])
  expect(result.updated).toEqual([{ id: 'a', title: 'Renamed by a maintainer' }])
  expect(await Store.get('a', { root: cwd })).toMatchObject({
    body: 'Rewritten by a maintainer.',
    issue: `${repo}#1`,
    title: 'Renamed by a maintainer',
  })
})

test('behavior: an open issue whose file was deleted is rebuilt', async () => {
  const cwd = await helpers.repo({ remote })
  const instance = await github({
    [repo]: [{ body: issueBody('a', 'Body.', 'blocker'), labels: ['friction'], title }],
  })

  const result = await cli.data<Outcome>(['sync', '--cwd', cwd], env(instance.url))
  expect(result.reopened).toEqual([{ id: 'a', title }])
  expect(result.updated).toEqual([{ id: 'a', title }])
  expect(await Store.get('a', { root: cwd })).toEqual({
    body: 'Body.',
    id: 'a',
    issue: `${repo}#1`,
    severity: 'blocker',
    title,
  })
})

test('behavior: a deleted issue clears the link and returns the entry to pending', async () => {
  const cwd = await helpers.repo({ remote })
  await Store.write(
    { body: 'Body.', issue: `${repo}#9`, severity: 'minor', title },
    { id: 'a', root: cwd },
  )
  const instance = await github()

  expect((await cli.data<Outcome>(['sync', '--cwd', cwd], env(instance.url))).cleared).toEqual([
    { id: 'a', title },
  ])
  expect((await Store.get('a', { root: cwd })).issue).toBeUndefined()
})

// Removing a label must not look like deletion: that would clear the link and let publish duplicate.
test('behavior: an issue that merely lost its label keeps its link', async () => {
  const cwd = await helpers.repo({ remote })
  await Store.write(
    { body: 'Body.', issue: `${repo}#1`, severity: 'minor', title },
    { id: 'a', root: cwd },
  )
  const instance = await github({
    [repo]: [{ body: issueBody('a'), labels: ['triage'], title }],
  })

  const result = await cli.data<Outcome>(['sync', '--cwd', cwd], env(instance.url))

  expect(result).toMatchObject({ cleared: [], removed: [], updated: [] })
  expect((await Store.get('a', { root: cwd })).issue).toBe(`${repo}#1`)
})

test('behavior: an unlabelled issue that closed still deletes its entry', async () => {
  const cwd = await helpers.repo({ remote })
  await Store.write(
    { body: 'Body.', issue: `${repo}#1`, severity: 'minor', title },
    { id: 'a', root: cwd },
  )
  const instance = await github({
    [repo]: [{ body: issueBody('a'), labels: ['triage'], state: 'closed', title }],
  })

  expect((await cli.data<Outcome>(['sync', '--cwd', cwd], env(instance.url))).removed).toEqual([
    { id: 'a', title },
  ])
})

test('behavior: --dry-run changes nothing', async () => {
  const { cwd, instance } = await linked({ state: 'closed' })

  const result = await cli.data<Outcome>(['sync', '--cwd', cwd, '--dry-run'], env(instance.url))

  expect(result).toMatchObject({ committed: false, removed: [{ id: 'a', title }] })
  expect(await Store.list({ root: cwd })).toEqual(['a'])
  expect(await Mirrors.resolve({ root: cwd })).toEqual(Mirrors.empty())
})

test('behavior: --no-commit leaves the change uncommitted', async () => {
  const { cwd, instance } = await linked({ state: 'closed' })

  const result = await cli.data<Outcome>(['sync', '--cwd', cwd, '--no-commit'], env(instance.url))

  expect(result.committed).toBe(false)
  expect(await helpers.git(['status', '--porcelain'], cwd)).toContain(
    '.agents/friction-log/a/friction.md',
  )
})

// Runs on a schedule and on every issue event, so a second pass must do nothing.
test('behavior: running twice is a no-op', async () => {
  const { cwd, instance } = await linked({ state: 'closed' })

  await cli.data<Outcome>(['sync', '--cwd', cwd], env(instance.url))
  const second = await cli.data<Outcome>(['sync', '--cwd', cwd], env(instance.url))

  expect(second).toMatchObject({ cleared: [], committed: false, removed: [], updated: [] })
})

// A consumer mirrors issues that live upstream, so reconciling must follow the links out.
describe('cross-repo', () => {
  const upstream = 'wevm/viem'

  /** An issue in `upstream` whose marker points at a file in this repository. */
  function upstreamBody(id = 'a'): string {
    return Github.renderBody({
      body: 'Body.',
      marker: { hash: Github.hash(title), origin: repo, path: Store.toPath(id) },
    })
  }

  async function reporting(state: 'closed' | 'open') {
    const cwd = await helpers.repo({ remote })
    await Store.write(
      { body: 'Body.', issue: `${upstream}#1`, severity: 'minor', target: 'viem', title },
      { id: 'a', root: cwd },
    )
    await helpers.commit('log friction', cwd)
    const instance = await github({ [upstream]: [{ body: upstreamBody(), state, title }] })
    return { cwd, instance }
  }

  test('behavior: an upstream issue that closed deletes the entry mirroring it', async () => {
    const { cwd, instance } = await reporting('closed')

    const result = await cli.data<Outcome>(['sync', '--cwd', cwd], env(instance.url))

    expect(result.removed).toEqual([{ id: 'a', title }])
    expect(await Store.list({ root: cwd })).toEqual([])
  })

  test('behavior: restores the final unlabelled upstream mirror after reopening', async () => {
    const cwd = await helpers.repo({ remote })
    await Store.write(
      { body: 'Body.', issue: `${upstream}#1`, severity: 'minor', target: 'viem', title },
      { id: 'a', root: cwd },
    )
    await helpers.commit('log friction', cwd)
    const instance = await github({
      [upstream]: [{ body: upstreamBody(), labels: [], state: 'closed', title }],
    })

    const closed = await cli.data<Outcome>(['sync', '--cwd', cwd], env(instance.url))
    expect(closed.removed).toEqual([{ id: 'a', title }])
    expect((await Mirrors.resolve({ root: cwd })).mirrors).toEqual([
      { issue: `${upstream}#1`, path: Store.toPath('a') },
    ])

    const issue = instance.issues.get(upstream)?.[0]
    if (issue) issue.state = 'open'
    const reopened = await cli.data<Outcome>(['sync', '--cwd', cwd], env(instance.url))
    expect(reopened.reopened).toEqual([{ id: 'a', title }])
    expect(reopened.updated).toEqual([{ id: 'a', title }])
    expect((await Store.get('a', { root: cwd })).issue).toBe(`${upstream}#1`)
    expect(await Mirrors.resolve({ root: cwd })).toEqual(Mirrors.empty())

    const third = await cli.data<Outcome>(['sync', '--cwd', cwd], env(instance.url))
    expect(third).toMatchObject({ cleared: [], committed: false, removed: [], updated: [] })
  })

  test('behavior: an open upstream issue leaves the entry alone', async () => {
    const { cwd, instance } = await reporting('open')

    const result = await cli.data<Outcome>(['sync', '--cwd', cwd], env(instance.url))

    expect(result).toMatchObject({ cleared: [], removed: [], updated: [] })
    expect((await Store.get('a', { root: cwd })).issue).toBe(`${upstream}#1`)
  })

  test('behavior: an upstream issue that no longer exists clears the link', async () => {
    const cwd = await helpers.repo({ remote })
    await Store.write(
      { body: 'Body.', issue: `${upstream}#9`, severity: 'minor', target: 'viem', title },
      { id: 'a', root: cwd },
    )
    const instance = await github()

    const result = await cli.data<Outcome>(['sync', '--cwd', cwd], env(instance.url))

    expect(result.cleared).toEqual([{ id: 'a', title }])
    expect((await Store.get('a', { root: cwd })).issue).toBeUndefined()
  })

  test('behavior: forgets a remembered issue that no longer exists', async () => {
    const cwd = await helpers.repo({ remote })
    await helpers.writeFile('README.md', '# demo\n', cwd)
    await Mirrors.write(
      Mirrors.update(Mirrors.empty(), {
        remember: [{ issue: `${upstream}#9`, path: Store.toPath('a') }],
      }),
      { root: cwd },
    )
    await helpers.commit('remember mirror', cwd)
    const instance = await github()

    const result = await cli.data<Outcome>(['sync', '--cwd', cwd], env(instance.url))

    expect(result.committed).toBe(true)
    expect(await Mirrors.resolve({ root: cwd })).toEqual(Mirrors.empty())
    expect(await helpers.git(['status', '--porcelain'], cwd)).toBe('')
  })

  test('behavior: reconciles this repository and an upstream one in one pass', async () => {
    const cwd = await helpers.repo({ remote })
    await Store.write(
      { body: 'Body.', issue: `${repo}#1`, severity: 'minor', title: 'Ours' },
      { id: 'ours', root: cwd },
    )
    await Store.write(
      { body: 'Body.', issue: `${upstream}#1`, severity: 'minor', target: 'viem', title },
      { id: 'theirs', root: cwd },
    )
    const instance = await github({
      [repo]: [
        {
          body: Github.renderBody({
            body: 'Body.',
            marker: { hash: Github.hash('Ours'), origin: repo, path: Store.toPath('ours') },
          }),
          state: 'closed',
          title: 'Ours',
        },
      ],
      [upstream]: [{ body: upstreamBody('theirs'), state: 'closed', title }],
    })

    const result = await cli.data<Outcome>(['sync', '--cwd', cwd], env(instance.url))

    expect(result.removed).toEqual([
      { id: 'ours', title: 'Ours' },
      { id: 'theirs', title },
    ])
    expect(await Store.list({ root: cwd })).toEqual([])
  })

  test('behavior: an unreachable destination defers while reachable changes commit', async () => {
    const cwd = await helpers.repo({ remote })
    await Store.write(
      { body: 'Body.', issue: `${repo}#1`, severity: 'minor', title: 'Ours' },
      { id: 'ours', root: cwd },
    )
    await Store.write(
      { body: 'Body.', issue: `${upstream}#1`, severity: 'minor', title: 'Theirs' },
      { id: 'theirs', root: cwd },
    )
    await Mirrors.write(
      Mirrors.update(Mirrors.empty(), {
        remember: [{ issue: `${upstream}#1`, path: Store.toPath('theirs') }],
      }),
      { root: cwd },
    )
    await helpers.commit('log friction', cwd)
    const instance = await github(
      {
        [repo]: [
          {
            body: Github.renderBody({
              body: 'Body.',
              marker: { hash: Github.hash('Ours'), origin: repo, path: Store.toPath('ours') },
            }),
            state: 'closed',
            title: 'Ours',
          },
        ],
      },
      { errors: { [upstream]: 404 } },
    )

    const result = await cli.data<Outcome>(['sync', '--cwd', cwd], env(instance.url))

    expect(result).toMatchObject({
      committed: true,
      deferred: [
        {
          code: 'REPO_NOT_FOUND',
          id: 'theirs',
          reason:
            'Cannot see `wevm/viem`. Either it does not exist, or the token cannot access it.',
        },
      ],
      removed: [{ id: 'ours', title: 'Ours' }],
    })
    expect(await Store.list({ root: cwd })).toEqual(['theirs'])
    expect((await Mirrors.resolve({ root: cwd })).mirrors).toContainEqual({
      issue: `${upstream}#1`,
      path: Store.toPath('theirs'),
    })
    expect(await helpers.git(['status', '--porcelain'], cwd)).toBe('')
  })
})

test('error: no git identity reads no issue state', async () => {
  const { cwd, instance } = await linked({ state: 'closed' })
  await helpers.git(['config', 'user.email', ''], cwd)

  expect((await cli.error(['sync', '--cwd', cwd], env(instance.url))).code).toBe('NO_GIT_IDENTITY')
  expect(instance.requests).toEqual([])
  expect(await Store.list({ root: cwd })).toEqual(['a'])
})

test('error: a failed commit is reported', async () => {
  const { cwd, instance } = await linked({ state: 'closed' })
  await helpers.git(['config', 'commit.gpgsign', 'true'], cwd)
  await helpers.git(['config', 'gpg.program', '/usr/bin/false'], cwd)

  expect((await cli.error(['sync', '--cwd', cwd], env(instance.url))).code).toBe('COMMIT_FAILED')
})

describe('--state', () => {
  async function state(
    cwd: string,
    reports: AppSync.Snapshot['reports'],
    options: {
      complete?: boolean | undefined
      repo?: string | undefined
      sha?: string | undefined
    } = {},
  ): Promise<string> {
    const directory = await helpers.tmpdir()
    const file = path.join(directory, 'state.json')
    await fs.writeFile(
      file,
      AppSync.serialize({
        complete: options.complete ?? true,
        reports,
        repository: {
          fullName: options.repo ?? repo,
          id: 42,
          sha: options.sha ?? (await helpers.git(['rev-parse', 'HEAD'], cwd)),
        },
        version: 1,
      }),
      'utf8',
    )
    return file
  }

  test('behavior: links an open report without a GitHub token or network request', async () => {
    const cwd = await helpers.repo({ remote })
    const value: Entry.Entry = {
      body: 'Body.',
      id: 'a',
      severity: 'minor',
      title,
    }
    await Store.write(value, { id: value.id, root: cwd })
    await helpers.commit('log friction', cwd)
    const occurrence = AppSync.occurrence({ entry: value })
    const file = await state(cwd, {
      [occurrence]: { number: 7, repo, state: 'open' },
    })

    const result = await cli.data<Outcome>(['sync', '--cwd', cwd, '--state', file])

    expect(result).toMatchObject({
      committed: true,
      deferred: [],
      updated: [{ id: value.id, title }],
    })
    expect((await Store.get(value.id, { root: cwd })).issue).toBe(`${repo}#7`)
  })

  test('behavior: a close captures repository-owned contents and a reopen restores them', async () => {
    const cwd = await helpers.repo({ remote })
    const value: Entry.Entry = {
      body: 'Body.',
      id: 'a',
      issue: `${repo}#7`,
      labels: ['tooling'],
      severity: 'major',
      title,
    }
    await Store.write(value, { id: value.id, root: cwd })
    await helpers.commit('link friction', cwd)
    const occurrence = AppSync.occurrence({ entry: value })
    const closed = await state(cwd, {
      [occurrence]: { number: 7, repo, state: 'closed' },
    })

    const removed = await cli.data<Outcome>(['sync', '--cwd', cwd, '--state', closed])

    expect(removed.removed).toEqual([{ id: value.id, title }])
    expect(await Store.list({ root: cwd })).toEqual([])
    expect((await Mirrors.resolve({ root: cwd })).mirrors).toMatchObject([
      {
        contents: Entry.serialize(value),
        issue: `${repo}#7`,
        occurrence,
        path: Store.toPath(value.id),
      },
    ])

    const opened = await state(cwd, {
      [occurrence]: { number: 7, repo, state: 'open' },
    })
    const restored = await cli.data<Outcome>(['sync', '--cwd', cwd, '--state', opened])

    expect(restored.reopened).toEqual([{ id: value.id, title }])
    expect(await Store.get(value.id, { root: cwd })).toEqual(value)
  })

  test('behavior: incomplete App state defers without applying partial reports', async () => {
    const cwd = await helpers.repo({ remote })
    const value: Entry.Entry = {
      body: 'Body.',
      id: 'a',
      severity: 'minor',
      title,
    }
    await Store.write(value, { id: value.id, root: cwd })
    await helpers.commit('log friction', cwd)
    const occurrence = AppSync.occurrence({ entry: value })
    const file = await state(
      cwd,
      { [occurrence]: { number: 7, repo, state: 'open' } },
      { complete: false },
    )

    const result = await cli.data<Outcome>(['sync', '--cwd', cwd, '--state', file])

    expect(result).toMatchObject({
      committed: false,
      deferred: [
        {
          code: 'APP_STATE_INCOMPLETE',
          id: value.id,
          reason: 'The Frog App could not inspect every report.',
        },
      ],
      updated: [],
    })
    expect((await Store.get(value.id, { root: cwd })).issue).toBeUndefined()
  })

  test('behavior: a reopened legacy mirror explains why it cannot be restored', async () => {
    const cwd = await helpers.repo({ remote })
    const issue = `${repo}#7`
    const mirror = { issue, path: Store.toPath('a') }
    await Mirrors.write(Mirrors.update(Mirrors.empty(), { remember: [mirror] }), { root: cwd })
    await helpers.commit('remember friction', cwd)
    const file = await state(
      cwd,
      {
        [AppSync.legacyOccurrence(issue)]: { number: 7, repo, state: 'open' },
      },
      { complete: false },
    )

    const result = await cli.data<Outcome>(['sync', '--cwd', cwd, '--state', file])

    expect(result).toMatchObject({
      committed: false,
      deferred: [
        {
          code: 'APP_LEGACY_MIRROR',
          id: 'a',
          reason:
            'This report predates repository-owned recovery snapshots. Recreate it manually from its issue.',
        },
      ],
      reopened: [],
      updated: [],
    })
  })

  test('security: state for another repository or commit is rejected', async () => {
    const cwd = await helpers.repo({ remote })
    await helpers.writeFile('README.md', '# demo\n', cwd)
    await helpers.commit('initial', cwd)
    const otherRepo = await state(cwd, {}, { repo: 'attacker/repo' })
    const otherSha = await state(cwd, {}, { sha: 'f'.repeat(40) })

    expect((await cli.error(['sync', '--cwd', cwd, '--state', otherRepo])).code).toBe(
      'APP_STATE_MISMATCH',
    )
    expect((await cli.error(['sync', '--cwd', cwd, '--state', otherSha])).code).toBe(
      'APP_STATE_MISMATCH',
    )
  })

  test('security: paths and contents injected into the wire response are rejected', async () => {
    const cwd = await helpers.repo({ remote })
    await helpers.writeFile('README.md', '# demo\n', cwd)
    await helpers.commit('initial', cwd)
    const directory = await helpers.tmpdir()
    const file = path.join(directory, 'malicious.json')
    await fs.writeFile(
      file,
      JSON.stringify({
        complete: true,
        patch: 'README.md',
        reports: {},
        repository: {
          fullName: repo,
          id: 42,
          sha: await helpers.git(['rev-parse', 'HEAD'], cwd),
        },
        version: 1,
      }),
      'utf8',
    )

    expect((await cli.error(['sync', '--cwd', cwd, '--state', file])).code).toBe(
      'INVALID_APP_SYNC_STATE',
    )
    expect(await fs.readFile(path.join(cwd, 'README.md'), 'utf8')).toBe('# demo\n')
  })
})
