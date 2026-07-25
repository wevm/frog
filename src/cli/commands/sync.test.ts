import * as cli from '../../../test/cli.js'
import { github } from '../../../test/github.js'
import * as helpers from '../../../test/helpers.js'
import * as Github from '../../Github.js'
import * as Store from '../../Store.js'

const repo = 'wevm/demo'
const remote = `git@github.com:${repo}.git`
const title = 'Filters ignored'

type Outcome = {
  cleared: string[]
  committed: boolean
  removed: string[]
  updated: string[]
}

function env(url: string): Record<string, string> {
  return { GITHUB_API_URL: url, GITHUB_TOKEN: 'test-token' }
}

function issueBody(id: string, body = 'Body.'): string {
  return Github.renderBody({
    body,
    marker: { hash: Github.hash(title), origin: repo, path: Store.toPath(id) },
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

  expect(result).toMatchObject({ committed: true, removed: ['a'] })
  expect(await Store.list({ root: cwd })).toEqual([])
  expect(await helpers.git(['log', '-1', '--format=%s'], cwd)).toBe(
    'chore: sync friction log with issues',
  )
  expect(await helpers.git(['status', '--porcelain'], cwd)).toBe('')
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
    'a',
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

  expect((await cli.data<Outcome>(['sync', '--cwd', cwd], env(instance.url))).updated).toEqual([
    'a',
  ])
  expect(await Store.get('a', { root: cwd })).toMatchObject({
    body: 'Rewritten by a maintainer.',
    issue: `${repo}#1`,
    title: 'Renamed by a maintainer',
  })
})

test('behavior: an open issue whose file was deleted is rebuilt', async () => {
  const cwd = await helpers.repo({ remote })
  const instance = await github({
    [repo]: [{ body: issueBody('a'), labels: ['friction', 'friction:blocker'], title }],
  })

  expect((await cli.data<Outcome>(['sync', '--cwd', cwd], env(instance.url))).updated).toEqual([
    'a',
  ])
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
    'a',
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
    'a',
  ])
})

test('behavior: --dry-run changes nothing', async () => {
  const { cwd, instance } = await linked({ state: 'closed' })

  const result = await cli.data<Outcome>(['sync', '--cwd', cwd, '--dry-run'], env(instance.url))

  expect(result).toMatchObject({ committed: false, removed: ['a'] })
  expect(await Store.list({ root: cwd })).toEqual(['a'])
})

test('behavior: --no-commit leaves the change uncommitted', async () => {
  const { cwd, instance } = await linked({ state: 'closed' })

  const result = await cli.data<Outcome>(['sync', '--cwd', cwd, '--no-commit'], env(instance.url))

  expect(result.committed).toBe(false)
  expect(await helpers.git(['status', '--porcelain'], cwd)).toContain('.agents/friction-log/a.md')
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

    expect(result.removed).toEqual(['a'])
    expect(await Store.list({ root: cwd })).toEqual([])
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

    expect(result.cleared).toEqual(['a'])
    expect((await Store.get('a', { root: cwd })).issue).toBeUndefined()
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

    expect(result.removed.sort()).toEqual(['ours', 'theirs'])
    expect(await Store.list({ root: cwd })).toEqual([])
  })
})

test('error: a repository the token cannot see', async () => {
  const cwd = await helpers.repo({ remote })
  const instance = await github({}, { errors: { [repo]: 404 } })

  expect((await cli.error(['sync', '--cwd', cwd], env(instance.url))).code).toBe('REPO_NOT_FOUND')
})
