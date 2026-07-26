import { Github, Store } from 'frog'
import { Octokit } from 'octokit'
import { github } from '../../../test/github.js'
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

function entry(options: { issue?: string; target?: string } = {}): string {
  const fields = Object.entries({ severity: 'minor', title, ...options })
    .map(([key, value]) => `${key}: '${value}'`)
    .join('\n')
  return `---\n${fields}\n---\n\nThe filter was swallowed.\n`
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

    const outcome = await issues({
      client: octokit,
      installation: async () => undefined,
      issue: { body: body(consumer), number: 1, state: 'closed', title },
      repo: consumer,
    })

    expect(outcome.plan?.remove).toEqual(['a'])
    expect(instance.files(consumer)[`${dir}/a/friction.md`]).toBeUndefined()
    expect(instance.messages(consumer)).toEqual(['initial', 'chore: sync friction log'])
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
    expect(Object.keys(instance.files(consumer))).toEqual(['README.md'])
  })

  test('behavior: a reopened issue rebuilds the entry that was deleted', async () => {
    const instance = await github(
      { [consumer]: [{ body: body(consumer), title }] },
      { files: { [consumer]: { 'README.md': '# app' } } },
    )

    const outcome = await issues({
      client: client(instance.url),
      installation: async () => undefined,
      issue: { body: body(consumer), number: 1, state: 'open', title },
      repo: consumer,
    })

    expect(outcome.plan?.write.map((value) => value.id)).toEqual(['a'])
    expect(instance.files(consumer)[`${dir}/a/friction.md`]).toContain(title)
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
    expect(instance.messages(consumer)).toHaveLength(2)
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
    expect(instance.files(consumer)[`${dir}/a/friction.md`]).toBeUndefined()
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
