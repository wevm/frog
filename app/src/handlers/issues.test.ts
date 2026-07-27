import { Github, Mirrors, Store } from 'frog'
import { Octokit } from 'octokit'
import { github } from '../../../test/github.js'
import type { Serialize } from '../internal/serialize.js'
import { issues } from './issues.js'

const consumer = 'acme/app'
const upstream = 'wevm/viem'
const dir = '.agents/friction-log'
const title = 'Filters ignored'

function client(url: string): Octokit {
  return new Octokit({
    auth: 'token',
    baseUrl: url,
    retry: { enabled: false },
    throttle: { enabled: false },
  })
}

/** Branch reconciliation lands on, now that a pull request is the default. */
const synced = 'frog/sync'

function entry(options: { issue?: string; target?: string; title?: string } = {}): string {
  const fields = Object.entries({ severity: 'minor', title, ...options })
    .map(([key, value]) => `${key}: '${value}'`)
    .join('\n')
  return `---\n${fields}\n---\n\nThe filter was swallowed.\n`
}

function journal(issue: string, id = 'a'): string {
  return Mirrors.serialize(
    Mirrors.update(Mirrors.empty(), {
      remember: [{ issue, path: Store.toPath(id) }],
    }),
  )
}

/** An issue body carrying the marker that names its mirror. */
function body(origin: string, id = 'a'): string {
  return Github.renderBody({
    body: 'The filter was swallowed.',
    marker: { hash: Github.hash(title), origin, path: Store.toPath(id) },
  })
}

describe('same repository', () => {
  test('behavior: a closed issue deletes its entry', async () => {
    const instance = await github(
      { [consumer]: [{ body: body(consumer), state: 'closed', title }] },
      { files: { [consumer]: { [`${dir}/a/friction.md`]: entry({ issue: `${consumer}#1` }) } } },
    )
    const octokit = client(instance.url)
    const repositories: string[] = []
    const serialize: Serialize = async (repo, operation) => {
      repositories.push(repo)
      return operation()
    }

    const outcome = await issues({
      client: octokit,
      installation: async () => undefined,
      issue: { body: body(consumer), number: 1, state: 'closed', title },
      repo: consumer,
      serialize,
    })

    expect(outcome.plan?.remove).toEqual(['a'])
    expect(instance.files(consumer, synced)[`${dir}/a/friction.md`]).toBeUndefined()
    expect(Mirrors.from(JSON.parse(instance.files(consumer, synced)[Mirrors.file] ?? ''))).toEqual({
      mirrors: [{ issue: `${consumer}#1`, path: Store.toPath('a') }],
      version: 1,
    })
    expect(instance.messages(consumer, synced)).toEqual(['initial', 'chore: sync friction log'])
    expect(repositories).toEqual([consumer])
  })

  test('behavior: closing takes the reproduction with it', async () => {
    const instance = await github(
      { [consumer]: [{ body: body(consumer), state: 'closed', title }] },
      {
        files: {
          [consumer]: {
            [`${dir}/a/artifacts/nested/fixture.json`]: '{}\n',
            [`${dir}/a/artifacts/repro.ts`]: 'export {}\n',
            [`${dir}/a/friction.md`]: entry({ issue: `${consumer}#1` }),
            'README.md': '# app',
          },
        },
      },
    )

    await issues({
      client: client(instance.url),
      installation: async () => undefined,
      issue: { body: body(consumer), number: 1, state: 'closed', title },
      repo: consumer,
    })

    // Nothing under the entry survives, and nothing outside it is touched.
    expect(Object.keys(instance.files(consumer, synced)).sort()).toEqual(
      [Mirrors.file, 'README.md'].sort(),
    )
  })

  test('behavior: a reopened issue rebuilds the entry that was deleted', async () => {
    const instance = await github(
      { [consumer]: [{ body: body(consumer, 'forged'), title }] },
      {
        files: {
          [consumer]: {
            [Mirrors.file]: journal(`${consumer}#1`),
            'README.md': '# app',
          },
        },
      },
    )

    const outcome = await issues({
      client: client(instance.url),
      installation: async () => undefined,
      issue: { body: body(consumer, 'forged'), number: 1, state: 'open', title },
      repo: consumer,
    })

    expect(outcome.plan?.write.map((value) => value.id)).toEqual(['a'])
    expect(instance.files(consumer, synced)[`${dir}/a/friction.md`]).toContain(title)
    expect(instance.files(consumer, synced)[Mirrors.file]).toBeUndefined()
  })

  test('behavior: a matching issue and entry need no commit', async () => {
    const instance = await github(
      { [consumer]: [{ body: body(consumer), title }] },
      { files: { [consumer]: { [`${dir}/a/friction.md`]: entry({ issue: `${consumer}#1` }) } } },
    )

    const outcome = await issues({
      client: client(instance.url),
      installation: async () => undefined,
      issue: { body: body(consumer), number: 1, state: 'open', title },
      repo: consumer,
    })

    expect(outcome.committed).toBeUndefined()
    expect(instance.messages(consumer)).toEqual(['initial'])
  })

  test('behavior: a delayed close event cannot overwrite current reopened state', async () => {
    const instance = await github(
      { [consumer]: [{ body: body(consumer), state: 'open', title }] },
      { files: { [consumer]: { [`${dir}/a/friction.md`]: entry({ issue: `${consumer}#1` }) } } },
    )

    const outcome = await issues({
      client: client(instance.url),
      installation: async () => undefined,
      // This is the older queued snapshot. `Sync.state` must refetch after acquiring the lease.
      issue: { body: body(consumer), number: 1, state: 'closed', title },
      repo: consumer,
    })

    expect(outcome.plan?.remove).toEqual([])
    expect(outcome.committed).toBeUndefined()
    expect(instance.files(consumer)[`${dir}/a/friction.md`]).toBeTruthy()
    expect(instance.messages(consumer)).toEqual(['initial'])
  })

  // Runs on every issue event, so a second pass must change nothing.
  test('behavior: reconciling twice makes one commit', async () => {
    const instance = await github(
      { [consumer]: [{ body: body(consumer), state: 'closed', title }] },
      { files: { [consumer]: { [`${dir}/a/friction.md`]: entry({ issue: `${consumer}#1` }) } } },
    )
    const event = {
      client: client(instance.url),
      installation: async () => undefined,
      issue: { body: body(consumer), number: 1, state: 'closed', title },
      repo: consumer,
    }

    await issues(event)
    const second = await issues(event)

    expect(second.committed).toBeUndefined()
    expect(instance.messages(consumer, synced)).toHaveLength(2)
  })
})

// The federated loop closing in the other direction: upstream resolves it, the consumer's mirror goes.
describe('cross-repo', () => {
  test('behavior: closing upstream deletes the mirror in the consumer', async () => {
    const instance = await github(
      { [upstream]: [{ body: body(consumer), state: 'closed', title }] },
      {
        files: {
          [consumer]: {
            [`${dir}/a/friction.md`]: entry({ issue: `${upstream}#1`, target: 'viem' }),
          },
        },
      },
    )
    const octokit = client(instance.url)

    const outcome = await issues({
      client: octokit,
      installation: async (repo) => (repo === consumer ? octokit : undefined),
      issue: { body: body(consumer), number: 1, state: 'closed', title },
      repo: upstream,
    })

    expect(outcome.origin).toBe(consumer)
    expect(outcome.plan?.remove).toEqual(['a'])
    expect(instance.files(consumer, synced)[`${dir}/a/friction.md`]).toBeUndefined()
  })

  // Without an installation on the consumer there is no token to write with.
  test('behavior: ignored when the App is not installed on the origin', async () => {
    const instance = await github(
      { [upstream]: [{ body: body(consumer), state: 'closed', title }] },
      {
        files: {
          [consumer]: {
            [`${dir}/a/friction.md`]: entry({ issue: `${upstream}#1`, target: 'viem' }),
          },
        },
      },
    )

    const outcome = await issues({
      client: client(instance.url),
      installation: async () => undefined,
      issue: { body: body(consumer), number: 1, state: 'closed', title },
      repo: upstream,
    })

    expect(outcome.ignored).toBe('frog is not installed on `acme/app`')
    expect(instance.files(consumer)[`${dir}/a/friction.md`]).toBeTruthy()
  })
})

test('security: an unrecorded marker cannot authorize repository writes', async () => {
  const instance = await github(
    { [upstream]: [{ body: body(consumer, 'forged'), state: 'closed', title }] },
    { files: { [consumer]: { 'README.md': '# app' } } },
  )
  const octokit = client(instance.url)

  const outcome = await issues({
    client: octokit,
    installation: async (repo) => (repo === consumer ? octokit : undefined),
    issue: { body: body(consumer, 'forged'), number: 1, state: 'closed', title },
    repo: upstream,
  })

  expect(outcome.ignored).toBe('untrusted frog marker')
  expect(instance.files(consumer)).toEqual({ 'README.md': '# app' })
  expect(instance.messages(consumer)).toEqual(['initial'])
})

test('security: a marker cannot redirect a trusted mirror path', async () => {
  const instance = await github(
    { [consumer]: [{ body: body(consumer, 'forged'), state: 'closed', title }] },
    {
      files: {
        [consumer]: {
          [`${dir}/a/friction.md`]: entry({ issue: `${consumer}#1` }),
          'README.md': '# app',
        },
      },
    },
  )

  const outcome = await issues({
    client: client(instance.url),
    installation: async () => undefined,
    issue: { body: body(consumer, 'forged'), number: 1, state: 'closed', title },
    repo: consumer,
  })

  expect(outcome.plan?.remove).toEqual(['a'])
  expect(instance.files(consumer, synced)[`${dir}/a/friction.md`]).toBeUndefined()
  expect(instance.files(consumer, synced)[`${dir}/forged/friction.md`]).toBeUndefined()
  expect(Mirrors.from(JSON.parse(instance.files(consumer, synced)[Mirrors.file] ?? ''))).toEqual({
    mirrors: [{ issue: `${consumer}#1`, path: Store.toPath('a') }],
    version: 1,
  })
})

// Labelling an issue by hand must not make the App touch anybody's files.
test('behavior: an issue with no marker is ignored', async () => {
  const instance = await github(
    { [consumer]: [{ title: 'Filed by hand' }] },
    { files: { [consumer]: { [`${dir}/a/friction.md`]: entry({ issue: `${consumer}#1` }) } } },
  )

  const outcome = await issues({
    client: client(instance.url),
    installation: async () => undefined,
    issue: { body: 'Filed by hand.', number: 1, state: 'closed', title: 'Filed by hand' },
    repo: consumer,
  })

  expect(outcome.ignored).toBe('no frog marker')
  expect(instance.messages(consumer)).toEqual(['initial'])
})

test('behavior: an issue whose marker has no path is ignored', async () => {
  const instance = await github({}, { files: { [consumer]: { 'README.md': '# app' } } })

  const outcome = await issues({
    client: client(instance.url),
    installation: async () => undefined,
    issue: {
      body: Github.renderBody({ body: 'Body.', marker: { hash: 'abc123' } }),
      number: 1,
      state: 'closed',
      title,
    },
    repo: consumer,
  })

  expect(outcome.ignored).toBe('no frog marker')
})

describe('pullRequest', () => {
  const review = JSON.stringify({ pullRequest: { branch: synced } })

  /** A consumer that reconciles through review rather than by pushing to its default branch. */
  function repo(entries: Record<string, string>) {
    return {
      files: {
        [consumer]: { [`${dir}/config.json`]: review, ...entries },
      },
    }
  }

  test('behavior: a closed issue opens a pull request and leaves the default branch alone', async () => {
    const instance = await github(
      { [consumer]: [{ body: body(consumer), state: 'closed', title }] },
      repo({ [`${dir}/a/friction.md`]: entry({ issue: `${consumer}#1` }) }),
    )

    const outcome = await issues({
      client: client(instance.url),
      installation: async () => undefined,
      issue: { body: body(consumer), number: 1, state: 'closed', title },
      repo: consumer,
    })

    // The entry is gone on the reconciling branch, and still there on the default one.
    expect(instance.files(consumer, 'frog/sync')[`${dir}/a/friction.md`]).toBeUndefined()
    expect(instance.files(consumer)[`${dir}/a/friction.md`]).toContain('issue:')
    expect(instance.messages(consumer)).toEqual(['initial'])

    expect(outcome.pullRequest).toBeDefined()
    const [review] = instance.reviews(consumer)
    const { body: description, ...opened } = review ?? {}
    expect(opened).toEqual({
      base: 'main',
      head: 'frog/sync',
      number: outcome.pullRequest,
      title: 'chore: sync friction log',
    })
    expect(description).toMatchInlineSnapshot(`
      "Opened by the [frog](https://github.com/wevm/frog) GitHub App.

      ## Resolved

      -   [acme/app#1](https://github.com/acme/app/issues/1) Filters ignored"
    `)
  })

  // Three closures, one review. The point of a long-lived branch rather than one per event.
  test('behavior: a second closure accumulates on the same pull request', async () => {
    const instance = await github(
      {
        [consumer]: [
          { body: body(consumer, 'a'), state: 'closed', title },
          // Still open, so the first reconciliation has no reason to touch its entry.
          { body: body(consumer, 'b'), state: 'open', title },
        ],
      },
      repo({
        [`${dir}/a/friction.md`]: entry({ issue: `${consumer}#1` }),
        [`${dir}/b/friction.md`]: entry({ issue: `${consumer}#2` }),
      }),
    )
    const octokit = client(instance.url)

    const first = await issues({
      client: octokit,
      installation: async () => undefined,
      issue: { body: body(consumer), number: 1, state: 'closed', title },
      repo: consumer,
    })
    // The second issue closes later, which is the case one long-lived branch exists to handle.
    const issue = instance.issues.get(consumer)?.[1]
    if (issue) issue.state = 'closed'

    const second = await issues({
      client: octokit,
      installation: async () => undefined,
      issue: { body: body(consumer, 'b'), number: 2, state: 'closed', title },
      repo: consumer,
    })

    expect(second.pullRequest).toBe(first.pullRequest)
    expect(instance.reviews(consumer)).toHaveLength(1)
    // Two closures, two commits, one branch. Rebuilding from the default branch each time would lose
    // the first deletion instead of stacking on it.
    expect(instance.messages(consumer, 'frog/sync')).toEqual([
      'initial',
      'chore: sync friction log',
      'chore: sync friction log',
    ])

    // Both deletions on the one branch.
    const files = instance.files(consumer, 'frog/sync')
    expect(files[`${dir}/a/friction.md`]).toBeUndefined()
    expect(files[`${dir}/b/friction.md`]).toBeUndefined()

    // And the description covers both, not just the closure that opened it.
    const description = instance.reviews(consumer)[0]?.body ?? ''
    expect(description).toContain(`[${consumer}#1](https://github.com/${consumer}/issues/1)`)
    expect(description).toContain(`[${consumer}#2](https://github.com/${consumer}/issues/2)`)
  })

  // The reopen has to reverse a deletion that is still only queued. Planning against the default branch
  // would see the entry present and the issue open, decide nothing was needed, and leave the deletion in
  // the review to be merged against an issue that is open again.
  test('behavior: a reopen before the merge reverses the queued deletion', async () => {
    const instance = await github(
      { [consumer]: [{ body: body(consumer), state: 'closed', title }] },
      repo({ [`${dir}/a/friction.md`]: entry({ issue: `${consumer}#1` }) }),
    )
    const octokit = client(instance.url)

    await issues({
      client: octokit,
      installation: async () => undefined,
      issue: { body: body(consumer), number: 1, state: 'closed', title },
      repo: consumer,
    })
    expect(instance.files(consumer, synced)[`${dir}/a/friction.md`]).toBeUndefined()

    const issue = instance.issues.get(consumer)?.[0]
    if (issue) issue.state = 'open'

    await issues({
      client: octokit,
      installation: async () => undefined,
      issue: { body: body(consumer), number: 1, state: 'open', title },
      repo: consumer,
    })

    // Back on the branch, so merging the review is a no-op rather than a deletion.
    expect(instance.files(consumer, synced)[`${dir}/a/friction.md`]).toContain(title)
    expect(instance.reviews(consumer)).toHaveLength(1)
  })

  // A merge that keeps the branch leaves it holding a tree the base has since moved past. Building the
  // next reconciliation on that stale tree writes a pull request that reverts whatever landed in between.
  test('behavior: a branch left behind by a merge is reset before reuse', async () => {
    const instance = await github(
      { [consumer]: [{ body: body(consumer), state: 'closed', title }] },
      repo({ [`${dir}/a/friction.md`]: entry({ issue: `${consumer}#1` }) }),
    )
    const octokit = client(instance.url)

    await issues({
      client: octokit,
      installation: async () => undefined,
      issue: { body: body(consumer), number: 1, state: 'closed', title },
      repo: consumer,
    })

    const [review] = instance.reviews(consumer)
    expect(review).toBeDefined()
    instance.merge(consumer, review?.number ?? 0)

    // Unrelated work lands on the default branch while the stale branch still exists.
    instance.write(consumer, `${dir}/b/friction.md`, entry({ title: 'Second friction' }))

    const issue = instance.issues.get(consumer)?.[0]
    if (issue) issue.state = 'open'

    await issues({
      client: octokit,
      installation: async () => undefined,
      issue: { body: body(consumer), number: 1, state: 'open', title },
      repo: consumer,
    })

    // Both, because the branch was reset to the default branch before the restore was committed on it.
    const files = instance.files(consumer, synced)
    expect(files[`${dir}/a/friction.md`]).toContain(title)
    expect(files[`${dir}/b/friction.md`]).toContain('Second friction')
  })

  test('behavior: opting out commits to the default branch', async () => {
    const instance = await github(
      { [consumer]: [{ body: body(consumer), state: 'closed', title }] },
      {
        files: {
          [consumer]: {
            [`${dir}/a/friction.md`]: entry({ issue: `${consumer}#1` }),
            [`${dir}/config.json`]: JSON.stringify({ pullRequest: false }),
          },
        },
      },
    )

    const outcome = await issues({
      client: client(instance.url),
      installation: async () => undefined,
      issue: { body: body(consumer), number: 1, state: 'closed', title },
      repo: consumer,
    })

    expect(outcome.pullRequest).toBeUndefined()
    expect(instance.reviews(consumer)).toEqual([])
    expect(instance.files(consumer)[`${dir}/a/friction.md`]).toBeUndefined()
  })
})
