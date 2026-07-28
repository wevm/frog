import { Github, Mirrors, Store } from 'frog'
import { Octokit } from 'octokit'
import { github } from '../../../test/github.js'
import type { Serialize } from '../internal/serialize.js'
import { issues } from './issues.js'

const app = 'frog-fm[bot]'
const consumer = 'acme/app'
const upstream = 'wevm/viem'
const title = 'Filters ignored'

function client(url: string): Octokit {
  return new Octokit({
    auth: 'token',
    baseUrl: url,
    retry: { enabled: false },
    throttle: { enabled: false },
  })
}

function entry(issue: string): string {
  return `---\ntitle: '${title}'\nseverity: 'minor'\nissue: '${issue}'\n---\n\nBody.\n`
}

function body(origin: string, id = 'a'): string {
  return Github.renderBody({
    body: 'Body.',
    marker: {
      hash: Github.hash(title),
      origin,
      path: Store.toPath(id),
    },
  })
}

function event(repo: string, origin = consumer): Github.Issue {
  return {
    author: app,
    body: body(origin),
    number: 1,
    state: 'closed',
    title,
  }
}

test('behavior: a trusted same-repository issue wakes the repository workflow', async () => {
  const instance = await github(
    { [consumer]: [{ body: body(consumer), state: 'closed', title }] },
    {
      files: {
        [consumer]: {
          [Store.toPath('a')]: entry(`${consumer}#1`),
        },
      },
    },
  )

  const outcome = await issues({
    app,
    client: client(instance.url),
    delivery: 'delivery-1',
    installation: async () => undefined,
    issue: event(consumer),
    repo: consumer,
  })

  expect(outcome).toMatchObject({
    origin: consumer,
    signal: { comment: 1, issue: 2 },
  })
  expect(instance.issues.get(consumer)?.[1]).toMatchObject({
    state: 'closed',
    title: 'Frog reconciliation',
    user: { login: app },
  })
  expect(instance.comments(consumer, 2)).toEqual([
    expect.stringContaining('<!-- frog:reconcile:v1 delivery='),
  ])
})

test('behavior: a trusted upstream issue wakes its source repository', async () => {
  const instance = await github(
    { [upstream]: [{ body: body(consumer), state: 'closed', title }] },
    {
      files: {
        [consumer]: {
          [Store.toPath('a')]: entry(`${upstream}#1`),
        },
      },
    },
  )
  const octokit = client(instance.url)

  const outcome = await issues({
    app,
    client: octokit,
    delivery: 'delivery-1',
    installation: async (repo) => (repo === consumer ? octokit : undefined),
    issue: event(upstream),
    repo: upstream,
  })

  expect(outcome.origin).toBe(consumer)
  expect(instance.issues.get(consumer)?.[0]?.title).toBe('Frog reconciliation')
  expect(instance.comments(consumer, 1)).toHaveLength(1)
})

test('behavior: a committed recovery record proves the binding after deletion', async () => {
  const state = Mirrors.update(Mirrors.empty(), {
    remember: [{ issue: `${consumer}#1`, path: Store.toPath('a') }],
  })
  const instance = await github(
    { [consumer]: [{ body: body(consumer), state: 'open', title }] },
    {
      files: {
        [consumer]: {
          [Mirrors.file]: Mirrors.serialize(state),
        },
      },
    },
  )

  const outcome = await issues({
    app,
    client: client(instance.url),
    delivery: 'delivery-1',
    installation: async () => undefined,
    issue: { ...event(consumer), state: 'open' },
    repo: consumer,
  })

  expect(outcome.signal).toEqual({ comment: 1, issue: 2 })
})

test('security: a copied marker on another author cannot wake a workflow', async () => {
  const instance = await github(
    { [consumer]: [{ body: body(consumer), state: 'closed', title }] },
    {
      files: {
        [consumer]: {
          [Store.toPath('a')]: entry(`${consumer}#1`),
        },
      },
    },
  )

  const outcome = await issues({
    app,
    client: client(instance.url),
    delivery: 'delivery-1',
    installation: async () => undefined,
    issue: { ...event(consumer), author: 'contributor' },
    repo: consumer,
  })

  expect(outcome).toEqual({ ignored: 'issue is not owned by Frog' })
  expect(instance.issues.get(consumer)).toHaveLength(1)
})

test('security: editable marker text cannot invent a repository binding', async () => {
  const instance = await github(
    { [consumer]: [{ body: body(consumer), state: 'closed', title }] },
    {
      files: {
        [consumer]: {
          [Store.toPath('a')]: entry(`${consumer}#99`),
        },
      },
    },
  )

  const outcome = await issues({
    app,
    client: client(instance.url),
    delivery: 'delivery-1',
    installation: async () => undefined,
    issue: event(consumer),
    repo: consumer,
  })

  expect(outcome).toEqual({ ignored: 'untrusted Frog marker', origin: consumer })
  expect(instance.issues.get(consumer)).toHaveLength(1)
})

test('behavior: conflicting wakeups are serialized by source repository', async () => {
  const instance = await github(
    { [consumer]: [{ body: body(consumer), state: 'closed', title }] },
    {
      files: {
        [consumer]: {
          [Store.toPath('a')]: entry(`${consumer}#1`),
        },
      },
    },
  )
  const repositories: string[] = []
  const serialize: Serialize = async (repo, operation) => {
    repositories.push(repo)
    return operation()
  }

  await issues({
    app,
    client: client(instance.url),
    delivery: 'delivery-1',
    installation: async () => undefined,
    issue: event(consumer),
    repo: consumer,
    serialize,
  })

  expect(repositories).toEqual([consumer])
})
