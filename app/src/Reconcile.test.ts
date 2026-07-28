import { Config, Entry, Github, Mirrors, Store } from 'frog'
import { Octokit } from 'octokit'
import { github } from '../../test/github.js'
import * as AppSync from '../../src/AppSync.js'
import { InvalidRepositoryError, reconcile } from './Reconcile.js'

const app = 'frog-fm[bot]'
const repo = 'acme/app'
const sha = 'a'.repeat(40)

function client(url: string): Octokit {
  return new Octokit({
    auth: 'token',
    baseUrl: url,
    retry: { enabled: false },
    throttle: { enabled: false },
  })
}

function entry(options: { id?: string; issue?: string; target?: string } = {}): Entry.Entry {
  return {
    body: 'The filter was swallowed.',
    id: options.id ?? 'a',
    ...(options.issue ? { issue: options.issue } : {}),
    severity: 'minor',
    ...(options.target ? { target: options.target } : {}),
    title: 'Filters ignored',
  }
}

function files(entries: readonly Entry.Entry[], extra: Record<string, string> = {}) {
  return {
    ...extra,
    ...Object.fromEntries(entries.map((value) => [Store.toPath(value.id), Entry.serialize(value)])),
  }
}

async function run(
  url: string,
  options: {
    installed?: readonly string[] | undefined
    repository?: string | undefined
  } = {},
) {
  const octokit = client(url)
  const source = options.repository ?? repo
  const installed = new Set(options.installed ?? [source])
  return reconcile({
    app,
    client: octokit,
    installation: async (target) => (installed.has(target) ? octokit : undefined),
    repo: source,
    repositoryId: 42,
    sha,
  })
}

test('behavior: files a pending report and returns content-free open state', async () => {
  const pending = entry()
  const instance = await github({}, { files: { [repo]: files([pending]) } })

  const snapshot = await run(instance.url)
  const occurrence = AppSync.occurrence({ entry: pending })

  expect(snapshot).toEqual({
    complete: true,
    reports: {
      [occurrence]: { number: 1, repo, state: 'open' },
    },
    repository: { fullName: repo, id: 42, sha },
    version: 1,
  })
  expect(instance.issues.get(repo)?.[0]).toMatchObject({
    title: pending.title,
    user: { login: app },
  })
  expect(instance.requests.some((request) => request.path.includes('/git/'))).toBe(false)

  const wire = AppSync.serialize(snapshot)
  expect(wire).not.toContain(Store.toPath(pending.id))
  expect(wire).not.toContain(pending.body)
  expect(wire).not.toContain(pending.title)
})

test('behavior: preserves cross-repository reporting through installed targets', async () => {
  const upstream = 'wevm/viem'
  const pending = entry({ target: upstream })
  const instance = await github(
    {},
    {
      files: {
        [repo]: files([pending], {
          [Config.file]: JSON.stringify({
            outbound: { allowedRepos: [upstream] },
          }),
        }),
        [upstream]: {
          [Config.file]: JSON.stringify({ inbound: { enabled: true } }),
        },
      },
    },
  )

  const snapshot = await run(instance.url, { installed: [repo, upstream] })

  expect(Object.values(snapshot.reports)).toEqual([{ number: 1, repo: upstream, state: 'open' }])
  expect(instance.issues.get(upstream)?.[0]?.title).toBe(pending.title)
  expect(Github.parseMarker(instance.issues.get(upstream)?.[0]?.body)).toMatchObject({
    origin: repo,
    path: Store.toPath(pending.id),
  })
})

test('behavior: reports linked closed and missing issues without changing repository contents', async () => {
  const closed = entry({ id: 'closed', issue: `${repo}#1` })
  const missing = entry({ id: 'missing', issue: `${repo}#99` })
  const instance = await github(
    { [repo]: [{ state: 'closed', title: closed.title }] },
    { files: { [repo]: files([closed, missing]) } },
  )

  const snapshot = await run(instance.url)

  expect(Object.values(snapshot.reports)).toEqual(
    expect.arrayContaining([
      { number: 1, repo, state: 'closed' },
      { number: 99, repo, state: 'missing' },
    ]),
  )
  expect(instance.files(repo)).toEqual(files([closed, missing]))
})

test('behavior: covers legacy recovery records without exposing their paths', async () => {
  const issue = `${repo}#1`
  const state = Mirrors.update(Mirrors.empty(), {
    remember: [{ issue, path: Store.toPath('deleted') }],
  })
  const instance = await github(
    { [repo]: [{ state: 'closed', title: 'Resolved' }] },
    { files: { [repo]: { [Mirrors.file]: Mirrors.serialize(state) } } },
  )

  const snapshot = await run(instance.url)

  expect(snapshot.complete).toBe(true)
  expect(snapshot.reports).toEqual({
    [AppSync.legacyOccurrence(issue)]: { number: 1, repo, state: 'closed' },
  })
  expect(AppSync.serialize(snapshot)).not.toContain(Store.toPath('deleted'))
})

test('behavior: a reopened legacy recovery record makes the snapshot incomplete', async () => {
  const issue = `${repo}#1`
  const state = Mirrors.update(Mirrors.empty(), {
    remember: [{ issue, path: Store.toPath('deleted') }],
  })
  const instance = await github(
    { [repo]: [{ state: 'open', title: 'Unresolved again' }] },
    { files: { [repo]: { [Mirrors.file]: Mirrors.serialize(state) } } },
  )

  const snapshot = await run(instance.url)

  expect(snapshot.complete).toBe(false)
  expect(snapshot.reports).toEqual({
    [AppSync.legacyOccurrence(issue)]: { number: 1, repo, state: 'open' },
  })
})

test('behavior: an unavailable destination makes the snapshot incomplete', async () => {
  const upstream = 'wevm/viem'
  const linked = entry({ issue: `${upstream}#1`, target: upstream })
  const instance = await github({}, { files: { [repo]: files([linked]) } })

  const snapshot = await run(instance.url)

  expect(snapshot.complete).toBe(false)
  expect(snapshot.reports).toEqual({})
})

test('security: a linked issue not authored by the App fails closed', async () => {
  const linked = entry({ issue: `${repo}#1` })
  const instance = await github(
    { [repo]: [{ author: 'contributor', title: linked.title }] },
    { files: { [repo]: files([linked]) } },
  )

  await expect(run(instance.url)).rejects.toThrow(InvalidRepositoryError)
})

test('behavior: the per-run ceiling produces an incomplete snapshot for a later retry', async () => {
  const instance = await github(
    {},
    {
      files: {
        [repo]: files([entry({ id: 'a' }), entry({ id: 'b' })], {
          [Config.file]: JSON.stringify({ maxPerRun: 1 }),
        }),
      },
    },
  )

  const snapshot = await run(instance.url)

  expect(snapshot.complete).toBe(false)
  expect(Object.keys(snapshot.reports)).toHaveLength(1)
  expect(instance.issues.get(repo)).toHaveLength(1)

  const retry = await run(instance.url)
  expect(retry.complete).toBe(true)
  expect(Object.keys(retry.reports)).toHaveLength(2)
  expect(instance.issues.get(repo)).toHaveLength(1)
  expect(instance.comments(repo, 1)).toHaveLength(1)
})
