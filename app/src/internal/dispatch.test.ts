import type * as Delivery from '../Delivery.js'
import * as dispatch from './dispatch.js'
import type * as serialization from './serialize.js'

const delivery: Delivery.Delivery = {
  id: 'delivery-1',
  name: 'issues',
  payload: {
    installation: { id: 42 },
    issue: { number: 9 },
    repository: { full_name: 'acme/app' },
  },
  v: 1,
}

function namespace(
  claim: 'claimed' | 'completed' | 'processing',
  order: string[] = [],
): serialization.Namespace {
  const coordinator: serialization.Coordinator = {
    abandon: vi.fn(async () => {
      order.push('abandon')
    }),
    acquire: vi.fn(async () => true),
    claim: vi.fn(async () => {
      order.push('claim')
      return claim
    }),
    complete: vi.fn(async () => {
      order.push('complete')
      return true
    }),
    release: vi.fn(async () => {}),
  }
  return { getByName: vi.fn(() => coordinator) }
}

test.each(['completed', 'processing'] as const)(
  'behavior: a %s claim does not hydrate or dispatch',
  async (claim) => {
    const expand = vi.fn(async () => {
      throw new Error('unreachable')
    })
    const receive = vi.fn(async () => {})

    await expect(dispatch.queued(namespace(claim), delivery, { expand, receive })).resolves.toEqual(
      {
        status: claim,
      },
    )
    expect(expand).not.toHaveBeenCalled()
    expect(receive).not.toHaveBeenCalled()
  },
)

test('behavior: an acquired claim hydrates before dispatch and preserves its delivery id', async () => {
  const order: string[] = []
  const event: Delivery.Event = {
    id: delivery.id,
    name: 'issues',
    payload: {
      action: 'edited',
      installation: { id: 42 },
      issue: { number: 9, state: 'open', title: 'Current title' },
      repository: { full_name: 'acme/app' },
    },
  }
  const expand = vi.fn(async () => {
    order.push('expand')
    return event
  })
  const receive = vi.fn(async (received: Delivery.Event) => {
    order.push('receive')
    expect(received.id).toBe('delivery-1')
  })

  await expect(
    dispatch.queued(namespace('claimed', order), delivery, { expand, receive }),
  ).resolves.toEqual({ result: undefined, status: 'processed' })
  expect(order).toEqual(['claim', 'expand', 'receive', 'complete'])
})

test('error: changing the delivery id prevents dispatch and abandons the claim', async () => {
  const order: string[] = []
  const receive = vi.fn(async () => {})

  await expect(
    dispatch.queued(namespace('claimed', order), delivery, {
      expand: async () =>
        ({
          id: 'different',
          name: 'issues',
          payload: {
            action: 'edited',
            installation: { id: 42 },
            issue: { number: 9, state: 'open', title: 'Current title' },
            repository: { full_name: 'acme/app' },
          },
        }) satisfies Delivery.Event,
      receive,
    }),
  ).rejects.toThrow('Expanded delivery id changed')
  expect(receive).not.toHaveBeenCalled()
  expect(order).toEqual(['claim', 'abandon'])
})
