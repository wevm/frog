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
  commented: { id: string; issue: string }[]
  committed: boolean
  created: { id: string; issue: string }[]
  deferred: { id: string; reason: string }[]
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

  expect(result.created).toEqual([{ id: 'a', issue: `${repo}#1` }])
  expect(result.commented).toEqual([])
  expect((await Store.get('a', { root: cwd })).issue).toBe(`${repo}#1`)

  const issue = instance.issues.get(repo)?.[0]
  expect(issue?.title).toBe('Filters ignored')
  expect(issue?.labels).toEqual(['friction', 'friction:major'])
  expect(Github.parseMarker(issue?.body)).toEqual({
    hash: Github.hash('Filters ignored'),
    origin: repo,
    path: '.agents/frictionsets/a.md',
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

  expect(result.commented).toEqual([{ id: 'a', issue: `${repo}#1` }])
  expect(instance.issues.get(repo)).toHaveLength(1)
  expect(instance.comments.get(`${repo}#1`)).toHaveLength(1)
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

  expect(result.created).toEqual([{ id: 'a', issue: `${repo}#1` }])
  expect(result.commented).toEqual([{ id: 'b', issue: `${repo}#1` }])
  expect(instance.issues.get(repo)).toHaveLength(1)
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
  expect(await helpers.git(['log', '-1', '--format=%s'], cwd)).toBe(
    'chore: link frictionsets to issues',
  )
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
  expect(await helpers.git(['status', '--porcelain'], cwd)).toContain('.agents/frictionsets/a.md')
})

test('behavior: --dry-run files nothing and writes nothing', async () => {
  const cwd = await helpers.repo({ remote })
  const instance = await github()
  await Store.write({ body, severity: 'minor', title: 'Filters ignored' }, { id: 'a', root: cwd })

  const result = await cli.data<Outcome>(['publish', '--cwd', cwd, '--dry-run'], env(instance.url))

  expect(result.created).toEqual([{ id: 'a', issue: '(new)' }])
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
  expect(result.deferred).toEqual([{ id: 'c', reason: 'over the ceiling of 2 per run' }])
  expect(instance.issues.get(repo)).toHaveLength(2)
})

describe('cross-repo', () => {
  const upstream = 'wevm/viem'

  /** Installs a package that declares it accepts friction. */
  async function install(cwd: string, name: string, frictionsets: unknown): Promise<void> {
    await helpers.writeFile(
      `node_modules/${name}/package.json`,
      JSON.stringify({ frictionsets, name }),
      cwd,
    )
  }

  test('behavior: files on the target named by an installed package', async () => {
    const cwd = await helpers.repo({ remote })
    const instance = await github()
    await install(cwd, 'viem', { inbound: true, repo: upstream })
    await helpers.writeFile(
      Config.file,
      JSON.stringify({ outbound: { allowedRepos: [upstream] } }),
      cwd,
    )
    await Store.write(
      { body, severity: 'major', target: 'viem', title: 'Upstream friction' },
      { id: 'a', root: cwd },
    )

    const result = await cli.data<Outcome>(['publish', '--cwd', cwd], env(instance.url))

    expect(result.created).toEqual([{ id: 'a', issue: `${upstream}#1` }])
    expect(instance.issues.get(upstream)?.[0]?.title).toBe('Upstream friction')
    // The consumer's repository gets nothing.
    expect(instance.issues.get(repo)).toBeUndefined()
  })

  test('behavior: applies the labels the receiver asked for', async () => {
    const cwd = await helpers.repo({ remote })
    const instance = await github()
    await install(cwd, 'viem', {
      inbound: { enabled: true, labels: ['friction', 'from-consumer'] },
      repo: upstream,
    })
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

    expect(instance.issues.get(upstream)?.[0]?.labels).toEqual([
      'friction',
      'from-consumer',
      'friction:minor',
    ])
  })

  test('behavior: records the consumer repository as the origin', async () => {
    const cwd = await helpers.repo({ remote })
    const instance = await github()
    await install(cwd, 'viem', { inbound: true, repo: upstream })
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
    await install(cwd, 'viem', { inbound: true, repo: upstream })
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
    const instance = await github({}, { pushAccess: [] })

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

    expect(firstResult.created).toEqual([{ id: 'a', issue: `${upstream}#1` }])
    expect(secondResult.commented).toEqual([{ id: 'b', issue: `${upstream}#1` }])
    expect(instance.issues.get(upstream)).toHaveLength(1)
  })

  test('behavior: reports that the receiver labels could not be applied', async () => {
    const instance = await github({}, { pushAccess: [] })
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
    const instance = await github()
    await install(cwd, 'viem', { inbound: true, repo: upstream })
    await Store.write(
      { body, severity: 'minor', target: 'viem', title: 'Upstream friction' },
      { id: 'a', root: cwd },
    )

    const result = await cli.data<Outcome>(['publish', '--cwd', cwd], env(instance.url))

    expect(result.deferred).toEqual([
      { id: 'a', reason: '`wevm/viem` is not listed in `outbound.allowedRepos`.' },
    ])
    expect(instance.issues.get(upstream)).toBeUndefined()
  })

  test('behavior: defers a target that has opted out', async () => {
    const cwd = await helpers.repo({ remote })
    const instance = await github()
    await install(cwd, 'viem', { inbound: false, repo: upstream })
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
    const instance = await github()
    await helpers.writeFile('a.txt', 'a', cwd)
    await helpers.commit('init', cwd)
    await install(cwd, 'viem', { inbound: true, repo: upstream })
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
      'chore: link frictionsets to issues',
    )
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

// Octokit's own message is `Not Found - <docs url>`, which names neither the repository nor a fix.
test('error: a repository the token cannot see', async () => {
  const cwd = await helpers.repo({ remote })
  const instance = await github({}, { errors: { [repo]: 404 } })
  await Store.write({ body, severity: 'minor', title: 'Filters ignored' }, { id: 'a', root: cwd })

  expect(await cli.error(['publish', '--cwd', cwd], env(instance.url))).toMatchInlineSnapshot(`
    {
      "code": "REPO_NOT_FOUND",
      "message": "Cannot see \`wevm/demo\`. Either it does not exist, or the token cannot access it.",
    }
  `)
})

test('error: a token without issue write access', async () => {
  const cwd = await helpers.repo({ remote })
  const instance = await github({}, { errors: { [repo]: 403 } })
  await Store.write({ body, severity: 'minor', title: 'Filters ignored' }, { id: 'a', root: cwd })

  expect(await cli.error(['publish', '--cwd', cwd], env(instance.url))).toMatchInlineSnapshot(`
    {
      "code": "NOT_AUTHORIZED",
      "message": "The token was rejected for \`wevm/demo\`. It needs write access to issues.",
      "retryable": true,
    }
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
