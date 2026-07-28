import fs from 'node:fs/promises'
import path from 'node:path'
import * as cli from '../../../test/cli.js'
import { github } from '../../../test/github.js'
import * as helpers from '../../../test/helpers.js'
import * as Config from '../../Config.js'
import * as Github from '../../Github.js'
import * as Store from '../../Store.js'

const repo = 'wevm/demo'
const remote = `git@github.com:${repo}.git`
const body = '## Description\n\nThe filter was swallowed.'

type Outcome = {
  commented: { id: string; issue: string; title: string }[]
  committed: boolean
  created: { id: string; issue: string; title: string }[]
  deferred: { code: string; id: string; reason: string }[]
  unlabelled: string[]
}

function env(url: string): Record<string, string> {
  return { GITHUB_API_URL: url, GITHUB_TOKEN: 'test-token' }
}

test('behavior: files a pending entry and writes the link back', async () => {
  const cwd = await helpers.repo({ remote })
  const instance = await github()
  await Store.write({ body, severity: 'major', title: 'Filters ignored' }, { id: 'a', root: cwd })

  const result = await cli.data<Outcome>(['publish', '--cwd', cwd], env(instance.url))

  expect(result.created).toEqual([{ id: 'a', issue: `${repo}#1`, title: 'Filters ignored' }])
  expect(result.commented).toEqual([])
  expect((await Store.get('a', { root: cwd })).issue).toBe(`${repo}#1`)

  const issue = instance.issues.get(repo)?.[0]
  expect(issue?.title).toBe('Filters ignored')
  expect(issue?.labels).toEqual(['friction'])
  expect(Github.parseMarker(issue?.body)).toEqual({
    hash: Github.hash('Filters ignored'),
    origin: repo,
    path: '.agents/friction-log/a/friction.md',
    severity: 'major',
  })
})

test('behavior: skips entries already linked', async () => {
  const cwd = await helpers.repo({ remote })
  const instance = await github()
  await Store.write(
    { body, issue: `${repo}#7`, severity: 'minor', title: 'Already filed' },
    { id: 'a', root: cwd },
  )

  const result = await cli.data<Outcome>(['publish', '--cwd', cwd], env(instance.url))

  expect(result).toMatchObject({ commented: [], created: [], deferred: [] })
  expect(instance.issues.get(repo)).toBeUndefined()
})

test('behavior: comments rather than duplicating when an issue already covers it', async () => {
  const cwd = await helpers.repo({ remote })
  const instance = await github({
    [repo]: [{ body: Github.renderMarker({ hash: Github.hash('Filters ignored') }), title: 'Old' }],
  })
  await Store.write({ body, severity: 'minor', title: 'Filters ignored' }, { id: 'a', root: cwd })

  const result = await cli.data<Outcome>(['publish', '--cwd', cwd], env(instance.url))

  expect(result.commented).toEqual([{ id: 'a', issue: `${repo}#1`, title: 'Filters ignored' }])
  expect(instance.issues.get(repo)).toHaveLength(1)
  expect(instance.comments(repo, 1)).toHaveLength(1)
})

test('security: automated publishing ignores an issue owned by another author', async () => {
  const cwd = await helpers.repo({ remote })
  const instance = await github(
    {
      [repo]: [
        {
          author: 'contributor',
          body: Github.renderMarker({ hash: Github.hash('Filters ignored') }),
          title: 'Filters ignored',
        },
      ],
    },
    { author: 'github-actions[bot]' },
  )
  await Store.write({ body, severity: 'minor', title: 'Filters ignored' }, { id: 'a', root: cwd })

  const result = await cli.data<Outcome>(
    ['publish', '--cwd', cwd, '--expected-author', 'github-actions[bot]'],
    env(instance.url),
  )

  expect(result.created).toEqual([{ id: 'a', issue: `${repo}#2`, title: 'Filters ignored' }])
  expect(instance.issues.get(repo)).toHaveLength(2)
  expect(instance.comments(repo, 1)).toEqual([])
})

// The App re-runs publish on every pull request `synchronize`, so this has to hold.
test('behavior: running twice never opens a second issue', async () => {
  const cwd = await helpers.repo({ remote })
  const instance = await github()
  await Store.write({ body, severity: 'minor', title: 'Filters ignored' }, { id: 'a', root: cwd })

  await cli.data<Outcome>(['publish', '--cwd', cwd], env(instance.url))
  const second = await cli.data<Outcome>(['publish', '--cwd', cwd], env(instance.url))

  expect(second).toMatchObject({ commented: [], created: [] })
  expect(instance.issues.get(repo)).toHaveLength(1)
})

test('behavior: two entries with the same title in one run collapse onto one issue', async () => {
  const cwd = await helpers.repo({ remote })
  const instance = await github()
  await Store.write({ body, severity: 'minor', title: 'Filters ignored' }, { id: 'a', root: cwd })
  await Store.write(
    { body, severity: 'minor', title: '  FILTERS   ignored!  ' },
    { id: 'b', root: cwd },
  )

  const result = await cli.data<Outcome>(['publish', '--cwd', cwd], env(instance.url))

  expect(result.created).toEqual([{ id: 'a', issue: `${repo}#1`, title: 'Filters ignored' }])
  expect(result.commented).toEqual([
    { id: 'b', issue: `${repo}#1`, title: '  FILTERS   ignored!  ' },
  ])
  expect(instance.issues.get(repo)).toHaveLength(1)
})

test('behavior: a same-destination failure preserves earlier links and defers the tail', async () => {
  const cwd = await helpers.repo({ remote })
  const errors = {} as Record<string, number>
  let requests = 0
  Object.defineProperty(errors, repo, {
    get() {
      requests += 1
      return requests < 5 ? undefined : 403
    },
  })
  const instance = await github({}, { errors })
  for (const id of ['a', 'b', 'c'])
    await Store.write({ body, severity: 'minor', title: `Friction ${id}` }, { id, root: cwd })
  await helpers.commit('log friction', cwd)

  const result = await cli.data<Outcome>(['publish', '--cwd', cwd], env(instance.url))

  expect(result).toMatchObject({
    committed: true,
    created: [{ id: 'a', issue: `${repo}#1`, title: 'Friction a' }],
    deferred: [
      {
        code: 'NOT_AUTHORIZED',
        id: 'b',
        reason: 'The token was rejected for `wevm/demo`. It needs write access to issues.',
      },
      {
        code: 'NOT_AUTHORIZED',
        id: 'c',
        reason: 'The token was rejected for `wevm/demo`. It needs write access to issues.',
      },
    ],
  })
  expect((await Store.get('a', { root: cwd })).issue).toBe(`${repo}#1`)
  expect((await Store.get('b', { root: cwd })).issue).toBeUndefined()
  expect((await Store.get('c', { root: cwd })).issue).toBeUndefined()
  expect(instance.issues.get(repo)).toHaveLength(1)
  expect(
    instance.requests.filter(
      (request) => request.method === 'GET' && request.path === `/repos/${repo}`,
    ),
  ).toHaveLength(1)
  expect(await helpers.git(['status', '--porcelain'], cwd)).toBe('')
})

test('behavior: a filed issue consumes the ceiling when writing its link fails', async () => {
  const cwd = await helpers.repo({ remote })
  const instance = await github()
  for (const id of ['a', 'b'])
    await Store.write({ body, severity: 'minor', title: `Friction ${id}` }, { id, root: cwd })
  await helpers.commit('log friction', cwd)
  await fs.chmod(path.join(cwd, Store.toPath('a')), 0o444)

  const result = await cli.data<Outcome>(['publish', '--cwd', cwd, '--max', '1'], env(instance.url))

  expect(result).toMatchObject({
    committed: false,
    created: [{ id: 'a', issue: `${repo}#1`, title: 'Friction a' }],
    deferred: [
      {
        code: 'PUBLISH_FAILED',
        id: 'a',
      },
      {
        code: 'OVER_CEILING',
        id: 'b',
        reason: 'over the ceiling of 1 per run',
      },
    ],
  })
  expect(instance.issues.get(repo)).toHaveLength(1)
  expect((await Store.get('a', { root: cwd })).issue).toBeUndefined()
  expect((await Store.get('b', { root: cwd })).issue).toBeUndefined()
})

test('behavior: an ambiguous issue response consumes the ceiling', async () => {
  const cwd = await helpers.repo({ remote })
  const instance = await github({}, { disconnectIssueCreates: [repo] })
  for (const id of ['a', 'b'])
    await Store.write({ body, severity: 'minor', title: `Friction ${id}` }, { id, root: cwd })
  await helpers.commit('log friction', cwd)

  const result = await cli.data<Outcome>(['publish', '--cwd', cwd, '--max', '1'], env(instance.url))

  expect(result).toMatchObject({
    committed: false,
    created: [],
    deferred: [
      {
        code: 'PUBLISH_FAILED',
        id: 'a',
      },
      {
        code: 'OVER_CEILING',
        id: 'b',
        reason: 'over the ceiling of 1 per run',
      },
    ],
  })
  expect(instance.issues.get(repo)).toHaveLength(1)
  expect((await Store.get('a', { root: cwd })).issue).toBeUndefined()
  expect((await Store.get('b', { root: cwd })).issue).toBeUndefined()
})

test('behavior: a replayed issue does not consume the next run ceiling', async () => {
  const cwd = await helpers.repo({ remote })
  const instance = await github()
  for (const id of ['a', 'b'])
    await Store.write({ body, severity: 'minor', title: `Friction ${id}` }, { id, root: cwd })
  await helpers.commit('log friction', cwd)

  await cli.data<Outcome>(['publish', '--cwd', cwd, '--max', '1'], env(instance.url))
  await Store.write({ body, severity: 'minor', title: 'Friction a' }, { id: 'a', root: cwd })

  const preview = await cli.data<Outcome>(
    ['publish', '--cwd', cwd, '--max', '1', '--dry-run'],
    env(instance.url),
  )
  expect(preview.commented).toEqual([])
  expect(preview.deferred).toEqual([])
  expect(preview.created).toEqual([
    { id: 'a', issue: `${repo}#1`, title: 'Friction a' },
    { id: 'b', issue: '(new)', title: 'Friction b' },
  ])

  await Store.write(
    { body: 'Edited.', severity: 'minor', title: 'Friction a' },
    { id: 'a', root: cwd },
  )
  const edited = await cli.data<Outcome>(
    ['publish', '--cwd', cwd, '--max', '1', '--dry-run'],
    env(instance.url),
  )
  expect(edited.created).toEqual([{ id: 'a', issue: `${repo}#1`, title: 'Friction a' }])
  expect(edited.deferred).toEqual([
    { code: 'OVER_CEILING', id: 'b', reason: 'over the ceiling of 1 per run' },
  ])

  await Store.write({ body, severity: 'minor', title: 'Friction a' }, { id: 'a', root: cwd })
  const result = await cli.data<Outcome>(['publish', '--cwd', cwd, '--max', '1'], env(instance.url))

  expect(result.created).toEqual([
    { id: 'a', issue: `${repo}#1`, title: 'Friction a' },
    { id: 'b', issue: `${repo}#2`, title: 'Friction b' },
  ])
  expect(instance.issues.get(repo)).toHaveLength(2)
  expect(instance.comments(repo, 1)).toEqual([])
})

test('behavior: commits the links by default', async () => {
  const cwd = await helpers.repo({ remote })
  const instance = await github()
  await helpers.writeFile('a.txt', 'a', cwd)
  await helpers.commit('init', cwd)
  await Store.write({ body, severity: 'minor', title: 'Filters ignored' }, { id: 'a', root: cwd })
  await helpers.commit('log friction', cwd)

  const result = await cli.data<Outcome>(['publish', '--cwd', cwd], env(instance.url))

  expect(result.committed).toBe(true)
  expect(await helpers.git(['log', '-1', '--format=%s'], cwd)).toBe('chore: sync friction log')
  expect(await helpers.git(['status', '--porcelain'], cwd)).toBe('')
})

test('behavior: --no-commit leaves the link uncommitted', async () => {
  const cwd = await helpers.repo({ remote })
  const instance = await github()
  await Store.write({ body, severity: 'minor', title: 'Filters ignored' }, { id: 'a', root: cwd })
  await helpers.commit('log friction', cwd)

  const result = await cli.data<Outcome>(
    ['publish', '--cwd', cwd, '--no-commit'],
    env(instance.url),
  )

  expect(result.committed).toBe(false)
  expect(await helpers.git(['status', '--porcelain'], cwd)).toContain(
    '.agents/friction-log/a/friction.md',
  )
})

test('behavior: replaying an unlinked checkout adds no repeat comment', async () => {
  const cwd = await helpers.repo({ remote })
  const instance = await github()
  await Store.write({ body, severity: 'minor', title: 'Filters ignored' }, { id: 'a', root: cwd })
  await helpers.commit('log friction', cwd)

  await cli.data<Outcome>(['publish', '--cwd', cwd, '--no-commit'], env(instance.url))
  await helpers.git(['restore', '--', Store.toPath('a')], cwd)
  const replayed = await cli.data<Outcome>(
    ['publish', '--cwd', cwd, '--no-commit'],
    env(instance.url),
  )

  expect(replayed.created).toEqual([{ id: 'a', issue: `${repo}#1`, title: 'Filters ignored' }])
  expect(instance.issues.get(repo)).toHaveLength(1)
  expect(instance.comments(repo, 1)).toEqual([])
})

test('behavior: --dry-run files nothing and writes nothing', async () => {
  const cwd = await helpers.repo({ remote })
  const instance = await github()
  await Store.write({ body, severity: 'minor', title: 'Filters ignored' }, { id: 'a', root: cwd })

  const result = await cli.data<Outcome>(['publish', '--cwd', cwd, '--dry-run'], env(instance.url))

  expect(result.created).toEqual([{ id: 'a', issue: '(new)', title: 'Filters ignored' }])
  expect(instance.issues.get(repo)).toBeUndefined()
  expect((await Store.get('a', { root: cwd })).issue).toBeUndefined()
})

test('behavior: defers entries over the ceiling', async () => {
  const cwd = await helpers.repo({ remote })
  const instance = await github()
  for (const id of ['a', 'b', 'c'])
    await Store.write({ body, severity: 'minor', title: `Friction ${id}` }, { id, root: cwd })

  const result = await cli.data<Outcome>(['publish', '--cwd', cwd, '--max', '2'], env(instance.url))

  expect(result.created).toHaveLength(2)
  expect(result.deferred).toEqual([
    { code: 'OVER_CEILING', id: 'c', reason: 'over the ceiling of 2 per run' },
  ])
  expect(instance.issues.get(repo)).toHaveLength(2)
})

test('behavior: a refused entry does not consume the ceiling', async () => {
  const cwd = await helpers.repo({ remote })
  const instance = await github()
  await Store.write(
    { body, severity: 'minor', target: 'missing', title: 'Cannot resolve' },
    { id: 'a', root: cwd },
  )
  await Store.write({ body, severity: 'minor', title: 'Can file' }, { id: 'b', root: cwd })

  const result = await cli.data<Outcome>(['publish', '--cwd', cwd, '--max', '1'], env(instance.url))

  expect(result.created).toEqual([{ id: 'b', issue: `${repo}#1`, title: 'Can file' }])
  expect(result.deferred).toEqual([
    {
      code: 'TARGET_UNKNOWN',
      id: 'a',
      reason:
        '`missing` is not installed, or declares no GitHub repository. Name the repository instead, as `owner/name`.',
    },
  ])
})

describe('cross-repo', () => {
  const upstream = 'wevm/viem'

  /** Installs a package that names the repository its issues belong on. */
  async function install(cwd: string, name: string, repo: string): Promise<void> {
    await helpers.writeFile(
      `node_modules/${name}/package.json`,
      JSON.stringify({ name, repository: `https://github.com/${repo}` }),
      cwd,
    )
  }

  /** The upstream repository, with its inbound policy committed where consent is now read from. */
  function accepts(
    inbound: unknown = { enabled: true },
    options: { pushAccess?: readonly string[] | undefined } = {},
  ) {
    return {
      files: { [upstream]: { [Config.file]: JSON.stringify({ inbound }) } },
      ...(options.pushAccess ? { pushAccess: options.pushAccess } : {}),
    }
  }

  test('behavior: files on the target named by an installed package', async () => {
    const cwd = await helpers.repo({ remote })
    const instance = await github({}, accepts())
    await install(cwd, 'viem', upstream)
    await Store.write(
      { body, severity: 'major', target: 'viem', title: 'Upstream friction' },
      { id: 'a', root: cwd },
    )

    const result = await cli.data<Outcome>(['publish', '--cwd', cwd], env(instance.url))

    expect(result.created).toEqual([
      { id: 'a', issue: `${upstream}#1`, title: 'Upstream friction' },
    ])
    expect(instance.issues.get(upstream)?.[0]?.title).toBe('Upstream friction')
    // The consumer's repository gets nothing.
    expect(instance.issues.get(repo)).toBeUndefined()
  })

  test('behavior: applies the labels the receiver asked for', async () => {
    const cwd = await helpers.repo({ remote })
    const instance = await github(
      {},
      accepts({ enabled: true, labels: ['friction', 'from-consumer'] }),
    )
    await install(cwd, 'viem', upstream)
    await helpers.writeFile(
      Config.file,
      JSON.stringify({ outbound: { allowedRepos: [upstream] } }),
      cwd,
    )
    await Store.write(
      { body, severity: 'minor', target: 'viem', title: 'Upstream friction' },
      { id: 'a', root: cwd },
    )

    await cli.data<Outcome>(['publish', '--cwd', cwd], env(instance.url))

    expect(instance.issues.get(upstream)?.[0]?.labels).toEqual(['friction', 'from-consumer'])
  })

  test('behavior: records the consumer repository as the origin', async () => {
    const cwd = await helpers.repo({ remote })
    const instance = await github({}, accepts())
    await install(cwd, 'viem', upstream)
    await helpers.writeFile(
      Config.file,
      JSON.stringify({ outbound: { allowedRepos: [upstream] } }),
      cwd,
    )
    await Store.write(
      { body, severity: 'minor', target: 'viem', title: 'Upstream friction' },
      { id: 'a', root: cwd },
    )

    await cli.data<Outcome>(['publish', '--cwd', cwd], env(instance.url))

    // `origin` is what lets closing the upstream issue delete the mirror in this repository.
    expect(Github.parseMarker(instance.issues.get(upstream)?.[0]?.body)).toMatchObject({
      origin: repo,
    })
  })

  /** A consumer repository set up to report upstream. */
  async function consumer(name: string) {
    const cwd = await helpers.repo({ remote: `git@github.com:${name}.git` })
    await install(cwd, 'viem', upstream)
    await helpers.writeFile(
      Config.file,
      JSON.stringify({ outbound: { allowedRepos: [upstream] } }),
      cwd,
    )
    return cwd
  }

  // GitHub drops labels for a token without push access, which is every consumer reporting upstream.
  // Dedupe must not depend on a label that never got applied.
  test('behavior: two consumers reporting the same friction land on one issue', async () => {
    const instance = await github({}, accepts({ enabled: true }, { pushAccess: [] }))

    const first = await consumer('acme/app')
    await Store.write(
      { body, severity: 'minor', target: 'viem', title: 'Filters ignored' },
      { id: 'a', root: first },
    )
    const firstResult = await cli.data<Outcome>(['publish', '--cwd', first], env(instance.url))

    const second = await consumer('other/app')
    await Store.write(
      { body, severity: 'minor', target: 'viem', title: '  FILTERS   ignored!  ' },
      { id: 'b', root: second },
    )
    const secondResult = await cli.data<Outcome>(['publish', '--cwd', second], env(instance.url))

    expect(firstResult.created).toEqual([
      { id: 'a', issue: `${upstream}#1`, title: 'Filters ignored' },
    ])
    expect(secondResult.commented).toEqual([
      { id: 'b', issue: `${upstream}#1`, title: '  FILTERS   ignored!  ' },
    ])
    expect(instance.issues.get(upstream)).toHaveLength(1)
  })

  test('behavior: reports that the receiver labels could not be applied', async () => {
    const instance = await github({}, accepts({ enabled: true }, { pushAccess: [] }))
    const cwd = await consumer('acme/app')
    await Store.write(
      { body, severity: 'minor', target: 'viem', title: 'Filters are ignored' },
      { id: 'a', root: cwd },
    )

    const result = await cli.data<Outcome>(['publish', '--cwd', cwd], env(instance.url))

    expect(result.unlabelled).toEqual([upstream])
    expect(instance.issues.get(upstream)?.[0]?.labels).toEqual([])
  })

  test('behavior: defers a target the sender has not allowlisted', async () => {
    const cwd = await helpers.repo({ remote })
    const instance = await github({}, accepts())
    await install(cwd, 'viem', upstream)
    await helpers.writeFile(Config.file, JSON.stringify({ outbound: { allowedRepos: [] } }), cwd)
    await Store.write(
      { body, severity: 'minor', target: 'viem', title: 'Upstream friction' },
      { id: 'a', root: cwd },
    )

    const result = await cli.data<Outcome>(['publish', '--cwd', cwd], env(instance.url))

    expect(result.deferred).toEqual([
      {
        code: 'TARGET_NOT_ALLOWED',
        id: 'a',
        reason: '`wevm/viem` is not listed in `outbound.allowedRepos`.',
      },
    ])
    expect(instance.issues.get(upstream)).toBeUndefined()
  })

  test('behavior: defers a target that has opted out', async () => {
    const cwd = await helpers.repo({ remote })
    const instance = await github({}, accepts({ enabled: false }))
    await install(cwd, 'viem', upstream)
    await helpers.writeFile(
      Config.file,
      JSON.stringify({ outbound: { allowedRepos: [upstream] } }),
      cwd,
    )
    await Store.write(
      { body, severity: 'minor', target: 'viem', title: 'Upstream friction' },
      { id: 'a', root: cwd },
    )

    const result = await cli.data<Outcome>(['publish', '--cwd', cwd], env(instance.url))

    expect(result.deferred[0]?.reason).toContain('does not accept friction reported by others')
    expect(instance.issues.get(upstream)).toBeUndefined()
  })

  test('behavior: defers an unresolvable target with an actionable reason', async () => {
    const cwd = await helpers.repo({ remote })
    const instance = await github()
    await Store.write(
      { body, severity: 'minor', target: 'viem', title: 'Upstream friction' },
      { id: 'a', root: cwd },
    )

    const result = await cli.data<Outcome>(['publish', '--cwd', cwd], env(instance.url))

    expect(result.deferred[0]?.reason).toContain('not installed')
    expect(result.created).toEqual([])
  })

  test('behavior: one commit covers entries filed across two repositories', async () => {
    const cwd = await helpers.repo({ remote })
    const instance = await github({}, accepts())
    await helpers.writeFile('a.txt', 'a', cwd)
    await helpers.commit('init', cwd)
    await install(cwd, 'viem', upstream)
    await helpers.writeFile(
      Config.file,
      JSON.stringify({ outbound: { allowedRepos: [upstream] } }),
      cwd,
    )
    await Store.write({ body, severity: 'minor', title: 'Ours' }, { id: 'a', root: cwd })
    await Store.write(
      { body, severity: 'minor', target: 'viem', title: 'Theirs' },
      { id: 'b', root: cwd },
    )
    await helpers.commit('log friction', cwd)

    const result = await cli.data<Outcome>(['publish', '--cwd', cwd], env(instance.url))

    expect(result.created).toHaveLength(2)
    expect(result.committed).toBe(true)
    expect(await helpers.git(['status', '--porcelain'], cwd)).toBe('')
    expect((await helpers.git(['log', '--format=%s'], cwd)).split('\n')[0]).toBe(
      'chore: sync friction log',
    )
  })

  test('behavior: one destination failure preserves successful links', async () => {
    const cwd = await helpers.repo({ remote })
    const errors = {} as Record<string, number>
    let upstreamRequests = 0
    Object.defineProperty(errors, upstream, {
      get() {
        upstreamRequests += 1
        return upstreamRequests === 1 ? undefined : 403
      },
    })
    const instance = await github(
      {},
      {
        errors,
        files: {
          [upstream]: {
            [Config.file]: JSON.stringify({ inbound: { enabled: true } }),
          },
        },
      },
    )
    await helpers.writeFile(
      Config.file,
      JSON.stringify({ outbound: { allowedRepos: [upstream] } }),
      cwd,
    )
    await Store.write({ body, severity: 'minor', title: 'Ours' }, { id: 'a', root: cwd })
    await Store.write(
      { body, severity: 'minor', target: upstream, title: 'Theirs' },
      { id: 'b', root: cwd },
    )
    await helpers.commit('log friction', cwd)

    const result = await cli.data<Outcome>(['publish', '--cwd', cwd], env(instance.url))

    expect(result).toMatchObject({
      committed: true,
      created: [{ id: 'a', issue: `${repo}#1`, title: 'Ours' }],
      deferred: [
        {
          code: 'NOT_AUTHORIZED',
          id: 'b',
          reason: 'The token was rejected for `wevm/viem`. It needs write access to issues.',
        },
      ],
    })
    expect((await Store.get('a', { root: cwd })).issue).toBe(`${repo}#1`)
    expect((await Store.get('b', { root: cwd })).issue).toBeUndefined()
    expect(await helpers.git(['status', '--porcelain'], cwd)).toBe('')
  })

  test('behavior: a failed first destination leaves its ceiling slot for the next entry', async () => {
    const cwd = await helpers.repo({ remote })
    const errors = {} as Record<string, number>
    let upstreamRequests = 0
    Object.defineProperty(errors, upstream, {
      get() {
        upstreamRequests += 1
        return upstreamRequests === 1 ? undefined : 403
      },
    })
    const instance = await github(
      {},
      {
        errors,
        files: {
          [upstream]: {
            [Config.file]: JSON.stringify({ inbound: { enabled: true } }),
          },
        },
      },
    )
    await helpers.writeFile(
      Config.file,
      JSON.stringify({ outbound: { allowedRepos: [upstream] } }),
      cwd,
    )
    await Store.write(
      { body, severity: 'minor', target: upstream, title: 'Fails first' },
      { id: 'a', root: cwd },
    )
    await Store.write({ body, severity: 'minor', title: 'Files second' }, { id: 'b', root: cwd })
    await helpers.commit('log friction', cwd)

    const result = await cli.data<Outcome>(
      ['publish', '--cwd', cwd, '--max', '1'],
      env(instance.url),
    )

    expect(result).toMatchObject({
      committed: true,
      created: [{ id: 'b', issue: `${repo}#1`, title: 'Files second' }],
      deferred: [
        {
          code: 'NOT_AUTHORIZED',
          id: 'a',
          reason: 'The token was rejected for `wevm/viem`. It needs write access to issues.',
        },
      ],
    })
    expect(result.deferred.some((entry) => entry.code === 'OVER_CEILING')).toBe(false)
    expect((await Store.get('a', { root: cwd })).issue).toBeUndefined()
    expect((await Store.get('b', { root: cwd })).issue).toBe(`${repo}#1`)
  })
})

test('behavior: records the pull request in the issue body', async () => {
  const cwd = await helpers.repo({ remote })
  const instance = await github()
  await Store.write({ body, severity: 'minor', title: 'Filters ignored' }, { id: 'a', root: cwd })

  await cli.data<Outcome>(['publish', '--cwd', cwd, '--pr', '42'], env(instance.url))

  expect(instance.issues.get(repo)?.[0]?.body).toContain(`via ${repo}#42`)
})

test('error: no origin remote and no configured repo', async () => {
  const cwd = await helpers.repo()
  const instance = await github()
  await Store.write({ body, severity: 'minor', title: 'Filters ignored' }, { id: 'a', root: cwd })

  expect((await cli.error(['publish', '--cwd', cwd], env(instance.url))).code).toBe('NO_REPO')
})

test('error: no token available', async () => {
  const cwd = await helpers.repo({ remote })
  const instance = await github()
  await Store.write({ body, severity: 'minor', title: 'Filters ignored' }, { id: 'a', root: cwd })

  await helpers.withoutGh()

  expect((await cli.error(['publish', '--cwd', cwd], { GITHUB_API_URL: instance.url })).code).toBe(
    'NOT_AUTHENTICATED',
  )
  expect(instance.issues.get(repo)).toBeUndefined()
})

test('error: no git identity files nothing', async () => {
  const cwd = await helpers.repo({ remote })
  const instance = await github()
  await helpers.git(['config', 'user.email', ''], cwd)
  await Store.write({ body, severity: 'minor', title: 'Filters ignored' }, { id: 'a', root: cwd })

  expect((await cli.error(['publish', '--cwd', cwd], env(instance.url))).code).toBe(
    'NO_GIT_IDENTITY',
  )
  expect(instance.requests).toEqual([])
  expect(instance.issues.get(repo)).toBeUndefined()
})

test('error: a failed commit is reported', async () => {
  const cwd = await helpers.repo({ remote })
  const instance = await github()
  await Store.write({ body, severity: 'minor', title: 'Filters ignored' }, { id: 'a', root: cwd })
  await helpers.commit('log friction', cwd)
  await helpers.git(['config', 'commit.gpgsign', 'true'], cwd)
  await helpers.git(['config', 'gpg.program', '/usr/bin/false'], cwd)

  expect((await cli.error(['publish', '--cwd', cwd], env(instance.url))).code).toBe('COMMIT_FAILED')
})

// Octokit's own message is `Not Found - <docs url>`, which names neither the repository nor a fix.
test('behavior: a repository the token cannot see is deferred', async () => {
  const cwd = await helpers.repo({ remote })
  const instance = await github({}, { errors: { [repo]: 404 } })
  await Store.write({ body, severity: 'minor', title: 'Filters ignored' }, { id: 'a', root: cwd })

  expect((await cli.data<Outcome>(['publish', '--cwd', cwd], env(instance.url))).deferred)
    .toMatchInlineSnapshot(`
      [
        {
          "code": "REPO_NOT_FOUND",
          "id": "a",
          "reason": "Cannot see \`wevm/demo\`. Either it does not exist, or the token cannot access it.",
        },
      ]
    `)
})

test('behavior: a token without issue write access is deferred', async () => {
  const cwd = await helpers.repo({ remote })
  const instance = await github({}, { errors: { [repo]: 403 } })
  await Store.write({ body, severity: 'minor', title: 'Filters ignored' }, { id: 'a', root: cwd })

  expect((await cli.data<Outcome>(['publish', '--cwd', cwd], env(instance.url))).deferred)
    .toMatchInlineSnapshot(`
      [
        {
          "code": "NOT_AUTHORIZED",
          "id": "a",
          "reason": "The token was rejected for \`wevm/demo\`. It needs write access to issues.",
        },
      ]
    `)
})

test('behavior: nothing pending needs no token', async () => {
  const cwd = await helpers.repo({ remote })
  expect(await cli.data<Outcome>(['publish', '--cwd', cwd], {})).toMatchObject({
    commented: [],
    created: [],
    deferred: [],
  })
})
