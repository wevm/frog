import * as queue from './queue.js'

function body(id = 'delivery-1') {
  return {
    id,
    name: 'push',
    payload: {
      installation: { id: 42 },
      ref: 'refs/heads/main',
      repository: { default_branch: 'main', full_name: 'acme/app' },
      sender: null,
    },
    v: 1,
  }
}

function message(value: unknown = body(), attempts = 1): queue.consume.Message {
  return {
    ack: vi.fn(),
    attempts,
    body: value,
    retry: vi.fn(),
  }
}

test.each(['processed', 'completed'] as const)(
  'behavior: %s deliveries are acknowledged',
  async (status) => {
    const delivery = message()
    const process = vi.fn(async () => ({ status }))

    await queue.consume([delivery], { process })

    expect(delivery.ack).toHaveBeenCalledOnce()
    expect(delivery.retry).not.toHaveBeenCalled()
  },
)

test('behavior: an active delivery claim is retried instead of acknowledged', async () => {
  const delivery = message(body(), 3)

  await queue.consume([delivery], {
    process: vi.fn(async () => ({ status: 'processing' as const })),
  })

  expect(delivery.ack).not.toHaveBeenCalled()
  expect(delivery.retry).toHaveBeenCalledWith({ delaySeconds: 120 })
})

test('behavior: a failed attempt can later succeed without poisoning its delivery', async () => {
  const delivery = message()
  const failure = new Error('GitHub unavailable')
  const process = vi
    .fn<queue.consume.Options['process']>()
    .mockRejectedValueOnce(failure)
    .mockResolvedValueOnce({ status: 'processed' })

  await queue.consume([delivery], { process })
  expect(delivery.retry).toHaveBeenCalledOnce()
  expect(delivery.ack).not.toHaveBeenCalled()

  await queue.consume([delivery], { process })
  expect(delivery.ack).toHaveBeenCalledOnce()
})

test('behavior: one failed message does not retry the successful remainder of its batch', async () => {
  const failed = message(body('delivery-1'))
  const passed = message(body('delivery-2'))
  const process = vi.fn(async (delivery: { id: string }) => {
    if (delivery.id === 'delivery-1') throw new Error('failed')
    return { status: 'processed' as const }
  })

  await queue.consume([failed, passed], { process })

  expect(failed.retry).toHaveBeenCalledOnce()
  expect(failed.ack).not.toHaveBeenCalled()
  expect(passed.ack).toHaveBeenCalledOnce()
  expect(passed.retry).not.toHaveBeenCalled()
})

test('error: unknown queue versions retry toward the dead-letter queue', async () => {
  const delivery = message({ ...body(), v: 2 }, 5)
  const error = vi.fn()
  const process = vi.fn(async () => ({ status: 'processed' as const }))

  await queue.consume([delivery], { error, process })

  expect(process).not.toHaveBeenCalled()
  expect(delivery.ack).not.toHaveBeenCalled()
  expect(delivery.retry).toHaveBeenCalledWith({ delaySeconds: 480 })
  expect(error).toHaveBeenCalledWith(
    expect.any(Error),
    expect.objectContaining({ attempt: 5, delivery: 'delivery-1', event: 'push' }),
  )
})

test('behavior: retry backoff is capped below Queue retention', () => {
  expect(queue.retryDelay(1)).toBe(30)
  expect(queue.retryDelay(7)).toBe(1_920)
  expect(queue.retryDelay(8)).toBe(3_600)
  expect(queue.retryDelay(100)).toBe(3_600)

  const budget = Array.from({ length: 20 }, (_, index) => queue.retryDelay(index + 1)).reduce(
    (total, delay) => total + delay,
    0,
  )
  expect(budget).toBeGreaterThan(12 * 60 * 60)
  expect(budget).toBeLessThan(24 * 60 * 60)
})
