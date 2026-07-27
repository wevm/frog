import { Entry, Github } from 'frog'
import { Octokit } from 'octokit'
import { github } from '../../../test/github.js'
import type { Serialize } from '../internal/serialize.js'
import * as Repository from '../Repository.js'
import { pullRequest } from './pullRequest.js'
import { push } from './push.js'

const repo = 'acme/app'
const upstream = 'wevm/viem'
const dir = '.agents/friction-log'

function client(url: string): Octokit {
  return new Octokit({
    auth: 'token',
    baseUrl: url,
    retry: { enabled: false },
    throttle: { enabled: false },
  })
}

function entry(title: string, frontmatter: Record<string, string> = {}): string {
  const fields = Object.entries({ severity: 'minor', title, ...frontmatter })
    .map(([key, value]) => `${key}: '${value}'`)
    .join('\n')
  return `---\n${fields}\n---\n\nThe filter was swallowed.\n`
}

async function run(
  url: string,
  options: {
    installed?: Record<string, Octokit> | undefined
    serialize?: Serialize | undefined
  } = {},
) {
  return push({
    branch: 'main',
    client: client(url),
    installation: async (name) => options.installed?.[name],
    registry: `${url}/registry`,
    repo,
    ...(options.serialize ? { serialize: options.serialize } : {}),
  })
}

// A fork's pull request files the issue but cannot be linked in place, so the entry reaches the default
// branch still unlinked and the push handler reports it a second time. Both reports describe the same
// entry, so the occurrence must be recognised rather than announced as a fresh hit.
test('behavior: an entry filed from a pull request is not announced again on merge', async () => {
  const contents = entry('Filters ignored')
  const instance = await github({}, { head: { [repo]: { [`${dir}/a/friction.md`]: contents } } })

  await pullRequest({
    base: repo,
    baseRef: 'main',
    client: client(instance.url),
    head: 'head',
    headRef: 'head',
    headRepo: 'contributor/app',
    installation: async () => undefined,
    pr: 42,
    registry: `${instance.url}/registry`,
  })
  expect(instance.issues.get(repo)).toHaveLength(1)

  // The merge lands the same unlinked entry on the default branch.
  instance.write(repo, `${dir}/a/friction.md`, contents)
  const outcome = await run(instance.url)

  // Recognised as a replay of the filing that opened the issue, so no second issue and, above all, no
  // "Hit again" on an issue that already says exactly this.
  expect(outcome.created).toEqual([{ id: 'a', issue: `${repo}#1` }])
  expect(instance.issues.get(repo)).toHaveLength(1)
  expect(instance.comments(repo, 1)).toEqual([])
})

test('behavior: files pending entries and writes the link back in one commit', async () => {
  const instance = await github(
    {},
    { files: { [repo]: { [`${dir}/a/friction.md`]: entry('Filters ignored') } } },
  )

  const outcome = await run(instance.url)

  expect(outcome.created).toEqual([{ id: 'a', issue: `${repo}#1` }])
  expect(outcome.committed).toBeTruthy()
  expect(instance.messages(repo, 'frog/sync')).toEqual(['initial', 'chore: sync friction log'])
  // The default branch is untouched: the links arrive by review.
  expect(instance.messages(repo)).toEqual(['initial'])

  const written = instance.files(repo, 'frog/sync')[`${dir}/a/friction.md`] ?? ''
  expect(Entry.parse(written, { id: 'a' }).issue).toBe(`${repo}#1`)
})

// Under review the link lands on the reconciling branch, so the default branch keeps showing the entry
// as pending. Reading only that branch would re-file and re-commit on every later push.
test('behavior: the write-back settles even though the link is not on the default branch', async () => {
  const instance = await github(
    {},
    { files: { [repo]: { [`${dir}/a/friction.md`]: entry('Filters ignored') } } },
  )

  await run(instance.url)
  await run(instance.url)
  const third = await run(instance.url)

  expect(third).toEqual({ commented: [], created: [], deferred: [] })
  expect(instance.issues.get(repo)).toHaveLength(1)
  // One write-back, not one per push.
  expect(instance.messages(repo, 'frog/sync')).toEqual(['initial', 'chore: sync friction log'])
})

// The commit written here triggers another push. That run must do nothing.
test('behavior: the write-back does not cause a second commit', async () => {
  const instance = await github(
    {},
    { files: { [repo]: { [`${dir}/a/friction.md`]: entry('Filters ignored') } } },
  )

  await run(instance.url)
  const second = await run(instance.url)

  expect(second).toEqual({ commented: [], created: [], deferred: [] })
  expect(instance.messages(repo, 'frog/sync')).toHaveLength(2)
  expect(instance.issues.get(repo)).toHaveLength(1)
})

// A fork's pull request had issues filed but could not have its files updated.
test('behavior: an entry filed on a pull request gets its link on merge', async () => {
  const instance = await github(
    {
      [repo]: [
        {
          body: Github.renderMarker({ hash: Github.hash('Filters ignored') }),
          title: 'Filters ignored',
        },
      ],
    },
    { files: { [repo]: { [`${dir}/a/friction.md`]: entry('Filters ignored') } } },
  )

  const outcome = await run(instance.url)

  // Commented, not created: the issue already existed from the pull request run.
  expect(outcome.commented).toEqual([{ id: 'a', issue: `${repo}#1` }])
  expect(instance.issues.get(repo)).toHaveLength(1)
  const written = instance.files(repo, 'frog/sync')[`${dir}/a/friction.md`] ?? ''
  expect(Entry.parse(written, { id: 'a' }).issue).toBe(`${repo}#1`)
})

test('behavior: nothing pending makes no commit', async () => {
  const instance = await github(
    {},
    {
      files: {
        [repo]: { [`${dir}/a/friction.md`]: entry('Filters ignored', { issue: `${repo}#7` }) },
      },
    },
  )

  const outcome = await run(instance.url)

  expect(outcome).toEqual({ commented: [], created: [], deferred: [] })
  expect(instance.messages(repo)).toEqual(['initial'])
})

test('behavior: a deferred entry keeps its file untouched', async () => {
  const instance = await github(
    {},
    {
      files: {
        [repo]: {
          [`${dir}/a/friction.md`]: entry('Upstream friction', { target: 'viem' }),
          [`${dir}/config.json`]: JSON.stringify({
            outbound: { allowedRepos: [upstream], enabled: false },
          }),
        },
        [upstream]: { [`${dir}/config.json`]: JSON.stringify({ inbound: { enabled: true } }) },
      },
      packages: { viem: upstream },
    },
  )

  const outcome = await run(instance.url, { installed: { [upstream]: client(instance.url) } })

  expect(outcome.deferred[0]?.reason).toContain('`outbound.enabled` is off')
  expect(outcome.committed).toBeUndefined()
  expect(instance.files(repo)[`${dir}/a/friction.md`]).not.toContain('issue:')
})

test('behavior: an upstream filing writes the link into this repository', async () => {
  const instance = await github(
    {},
    {
      files: {
        [repo]: {
          [`${dir}/a/friction.md`]: entry('Upstream friction', { target: 'viem' }),
          [`${dir}/config.json`]: JSON.stringify({
            outbound: { allowedRepos: [upstream] },
          }),
        },
        [upstream]: { [`${dir}/config.json`]: JSON.stringify({ inbound: { enabled: true } }) },
      },
      packages: { viem: upstream },
    },
  )

  const outcome = await run(instance.url, { installed: { [upstream]: client(instance.url) } })

  expect(outcome.created).toEqual([{ id: 'a', issue: `${upstream}#1` }])
  const written = instance.files(repo, 'frog/sync')[`${dir}/a/friction.md`] ?? ''
  expect(Entry.parse(written, { id: 'a' }).issue).toBe(`${upstream}#1`)
})

test('behavior: a stale push snapshot does not overwrite a concurrent entry edit', async () => {
  const instance = await github(
    {},
    { files: { [repo]: { [`${dir}/a/friction.md`]: entry('Filters ignored') } } },
  )
  const octokit = client(instance.url)
  let mutations = 0
  const serialize: Serialize = async (_repo, operation) => {
    mutations += 1
    if (mutations === 2)
      await Repository.commit(octokit, {
        branch: 'main',
        message: 'chore: edit friction',
        repo,
        writes: [{ contents: entry('Edited concurrently'), path: `${dir}/a/friction.md` }],
      })
    return operation()
  }

  const outcome = await run(instance.url, { serialize })

  expect(outcome.created).toEqual([{ id: 'a', issue: `${repo}#1` }])
  expect(outcome.committed).toBeUndefined()
  expect(instance.messages(repo)).toEqual(['initial', 'chore: edit friction'])
  // The concurrent edit is on the default branch, and nothing must have overwritten it there.
  const written = instance.files(repo)[`${dir}/a/friction.md`] ?? ''
  const parsed = Entry.parse(written, { id: 'a' })
  expect(parsed.title).toBe('Edited concurrently')
  expect(parsed).not.toHaveProperty('issue')
})
