import * as Delivery from './Delivery.js'

const common = {
  installation: { id: 42 },
  repository: { full_name: 'acme/app' },
}

test('behavior: compacts a pull request delivery to the fields its handler reads', () => {
  expect(
    Delivery.fromWebhook({
      id: 'delivery-1',
      name: 'pull_request',
      payload: {
        action: 'synchronize',
        installation: common.installation,
        number: 7,
        pull_request: {
          base: { ref: 'main', repository: { ignored: true } },
          body: 'ignored',
          head: { repo: { ignored: true }, sha: 'abc123' },
          user: { avatar_url: 'ignored', login: 'contributor' },
        },
        repository: { ...common.repository, description: 'ignored' },
      },
    }),
  ).toEqual({
    id: 'delivery-1',
    name: 'pull_request',
    payload: {
      action: 'synchronize',
      installation: { id: 42 },
      number: 7,
      pull_request: {
        base: { ref: 'main' },
        head: { sha: 'abc123' },
        user: { login: 'contributor' },
      },
      repository: { full_name: 'acme/app' },
    },
    v: 1,
  })
})

test('behavior: strips push commits before measuring the queue message', () => {
  const delivery = Delivery.fromWebhook({
    id: 'delivery-2',
    name: 'push',
    payload: {
      ...common,
      commits: [{ message: 'x'.repeat(Delivery.maxBytes * 2) }],
      ref: 'refs/heads/main',
      repository: { ...common.repository, default_branch: 'main' },
      sender: { avatar_url: 'ignored', login: 'frog[bot]' },
    },
  })

  expect(delivery).toEqual({
    id: 'delivery-2',
    name: 'push',
    payload: {
      installation: { id: 42 },
      ref: 'refs/heads/main',
      repository: { default_branch: 'main', full_name: 'acme/app' },
      sender: { login: 'frog[bot]' },
    },
    v: 1,
  })
  expect(Delivery.bytes(delivery!)).toBeLessThan(Delivery.maxBytes)
})

test('behavior: queues an issue identity instead of its potentially oversized body', () => {
  const delivery = Delivery.fromWebhook({
    id: 'delivery-3',
    name: 'issues',
    payload: {
      action: 'edited',
      ...common,
      issue: { body: '🐸'.repeat(Delivery.maxBytes), number: 9, title: 'Ignored until hydration' },
    },
  })

  expect(delivery).toEqual({
    id: 'delivery-3',
    name: 'issues',
    payload: {
      installation: { id: 42 },
      issue: { number: 9 },
      repository: { full_name: 'acme/app' },
    },
    v: 1,
  })
  expect(Delivery.bytes(delivery!)).toBeLessThan(Delivery.maxBytes)
})

test('behavior: unsupported webhook actions are accepted without queueing', () => {
  expect(
    Delivery.fromWebhook({
      id: 'delivery-4',
      name: 'pull_request',
      payload: {
        action: 'closed',
        ...common,
        number: 7,
        pull_request: {
          base: { ref: 'main' },
          head: { sha: 'abc123' },
          user: null,
        },
      },
    }),
  ).toBeUndefined()
})

test('error: rejects malformed signed payloads and unknown queue versions', () => {
  expect(() =>
    Delivery.fromWebhook({
      id: 'delivery-5',
      name: 'push',
      payload: { ...common, ref: '', repository: { ...common.repository, default_branch: 'main' } },
    }),
  ).toThrow(Delivery.InvalidError)

  expect(() =>
    Delivery.fromQueue({
      id: 'delivery-5',
      name: 'issues',
      payload: {
        installation: { id: 42 },
        issue: { number: 9 },
        repository: { full_name: 'acme/app' },
      },
      v: 2,
    }),
  ).toThrow('Expected queue format version 1')
})

test('behavior: issue hydration uses current state after a delayed event', async () => {
  const delivery = Delivery.fromQueue({
    id: 'delivery-6',
    name: 'issues',
    payload: {
      installation: { id: 42 },
      issue: { number: 9 },
      repository: { full_name: 'acme/app' },
    },
    v: 1,
  })
  const issue = vi.fn(async () => ({
    body: 'Current body.',
    labels: ['friction'],
    number: 9,
    state: 'open',
    title: 'Current title',
  }))

  await expect(Delivery.toEvent(delivery, { issue })).resolves.toEqual({
    id: 'delivery-6',
    name: 'issues',
    payload: {
      action: 'edited',
      installation: { id: 42 },
      issue: {
        body: 'Current body.',
        labels: ['friction'],
        number: 9,
        state: 'open',
        title: 'Current title',
      },
      repository: { full_name: 'acme/app' },
    },
  })
  expect(issue).toHaveBeenCalledWith({
    installation: 42,
    issue: 9,
    repo: 'acme/app',
  })
})
