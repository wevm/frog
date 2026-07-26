import * as Delivery from '../Delivery.js'
import { receive } from './webhook.js'

const headers = {
  'x-github-delivery': 'delivery-1',
  'x-github-event': 'push',
  'x-hub-signature-256': 'sha256=valid',
}

const push = {
  installation: { id: 42 },
  ref: 'refs/heads/main',
  repository: { default_branch: 'main', full_name: 'acme/app' },
  sender: { login: 'contributor' },
}

function request(payload: unknown = push, overrides: Record<string, string> = {}): Request {
  return new Request('https://frog.test/', {
    body: typeof payload === 'string' ? payload : JSON.stringify(payload),
    headers: { ...headers, ...overrides },
    method: 'POST',
  })
}

function options(overrides: Partial<receive.Options> = {}): receive.Options {
  return {
    enqueue: vi.fn(async () => {}),
    verify: vi.fn(async () => true),
    ...overrides,
  }
}

function pushOfSize(bytes: number): typeof push {
  const projected = Delivery.fromWebhook({
    id: 'delivery-1',
    name: 'push',
    payload: push,
  })
  if (!projected) throw new Error('Expected a push delivery.')
  const fixed = Delivery.bytes(projected) - push.ref.length
  return { ...push, ref: 'x'.repeat(bytes - fixed) }
}

test('security: an invalid signature is rejected before parsing or queueing', async () => {
  const enqueue = vi.fn(async () => {})
  const verify = vi.fn(async () => false)

  const response = await receive(request('{not json'), { enqueue, verify })

  expect(response.status).toBe(401)
  expect(verify).toHaveBeenCalledWith('{not json', 'sha256=valid')
  expect(enqueue).not.toHaveBeenCalled()
})

test('behavior: a supported delivery is compacted and durably accepted', async () => {
  const enqueue = vi.fn(async (_delivery: Delivery.Delivery) => {})

  const response = await receive(
    request({ ...push, commits: [{ message: 'x'.repeat(300_000) }] }),
    options({ enqueue }),
  )

  expect(response.status).toBe(202)
  expect(await response.json()).toEqual({ accepted: true, queued: true })
  expect(enqueue).toHaveBeenCalledWith({
    id: 'delivery-1',
    name: 'push',
    payload: {
      installation: { id: 42 },
      ref: 'refs/heads/main',
      repository: { default_branch: 'main', full_name: 'acme/app' },
      sender: { login: 'contributor' },
    },
    v: 1,
  })
})

test('behavior: the response waits until Queue accepts the delivery', async () => {
  const queued = Promise.withResolvers<void>()
  const enqueue = vi.fn(async () => queued.promise)
  const pending = receive(request(), options({ enqueue }))

  await vi.waitFor(() => expect(enqueue).toHaveBeenCalledOnce())
  let settled = false
  void pending.then(() => {
    settled = true
  })
  await Promise.resolve()
  expect(settled).toBe(false)

  queued.resolve()
  await expect(pending).resolves.toMatchObject({ status: 202 })
})

test('behavior: unsupported events and actions are accepted without queueing', async () => {
  const enqueue = vi.fn(async () => {})
  const unsupportedEvent = await receive(
    request('{not json', { 'x-github-event': 'ping' }),
    options({ enqueue }),
  )
  const unsupportedAction = await receive(
    request(
      {
        action: 'closed',
        installation: { id: 42 },
        number: 7,
        pull_request: {
          base: { ref: 'main' },
          head: { sha: 'abc123' },
          user: null,
        },
        repository: { full_name: 'acme/app' },
      },
      { 'x-github-event': 'pull_request' },
    ),
    options({ enqueue }),
  )

  expect(unsupportedEvent.status).toBe(202)
  expect(unsupportedAction.status).toBe(202)
  expect(enqueue).not.toHaveBeenCalled()
})

test('error: malformed supported payloads are rejected without queueing', async () => {
  const enqueue = vi.fn(async () => {})

  const invalidJson = await receive(request('{not json'), options({ enqueue }))
  const invalidShape = await receive(request({ ...push, ref: '' }), options({ enqueue }))

  expect(invalidJson.status).toBe(400)
  expect(invalidShape.status).toBe(400)
  expect(enqueue).not.toHaveBeenCalled()
})

test('error: the Queue body boundary reserves metadata headroom without truncation', async () => {
  const enqueue = vi.fn(async () => {})

  const accepted = await receive(request(pushOfSize(Delivery.maxBytes)), options({ enqueue }))
  const rejected = await receive(request(pushOfSize(Delivery.maxBytes + 1)), options({ enqueue }))

  expect(accepted.status).toBe(202)
  expect(rejected.status).toBe(413)
  expect(enqueue).toHaveBeenCalledOnce()
})

test('error: an enqueue failure is visible and reports identifiers only', async () => {
  const failure = new Error('queue unavailable')
  const error = vi.fn()

  const response = await receive(
    request(),
    options({
      enqueue: vi.fn(async () => {
        throw failure
      }),
      error,
    }),
  )

  expect(response.status).toBe(503)
  expect(error).toHaveBeenCalledWith(failure, {
    delivery: 'delivery-1',
    event: 'push',
  })
})
