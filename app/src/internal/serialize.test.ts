import * as serialization from './serialize.js'

function namespace(coordinator: serialization.Coordinator) {
  const getByName = vi.fn((_name: string) => coordinator)
  return { binding: { getByName } satisfies serialization.Namespace, getByName }
}

function coordinator(
  overrides: Partial<serialization.Coordinator> = {},
): serialization.Coordinator {
  return {
    abandon: vi.fn(async () => {}),
    acquire: vi.fn(async () => true),
    claim: vi.fn(async () => 'claimed' as const),
    complete: vi.fn(async () => true),
    release: vi.fn(async () => {}),
    ...overrides,
  }
}

describe('delivery', () => {
  test('behavior: a completed delivery does not run again', async () => {
    const operation = vi.fn(async () => 'unreachable')
    const { binding, getByName } = namespace(
      coordinator({ claim: vi.fn(async () => 'completed' as const) }),
    )

    await expect(
      serialization.delivery(binding, { id: 'delivery-1', operation, owner: 'attempt-1' }),
    ).resolves.toEqual({ status: 'completed' })
    expect(operation).not.toHaveBeenCalled()
    expect(getByName).toHaveBeenCalledWith('delivery:delivery-1')
  })

  test('behavior: a processing delivery preserves its retryable status', async () => {
    const operation = vi.fn(async () => 'unreachable')
    const { binding } = namespace(coordinator({ claim: vi.fn(async () => 'processing' as const) }))

    await expect(
      serialization.delivery(binding, { id: 'delivery-1', operation, owner: 'attempt-2' }),
    ).resolves.toEqual({ status: 'processing' })
    expect(operation).not.toHaveBeenCalled()
  })

  test('behavior: success completes the claim and failure abandons it', async () => {
    const successful = coordinator()
    await expect(
      serialization.delivery(namespace(successful).binding, {
        id: 'delivery-1',
        operation: async () => 42,
        owner: 'attempt-1',
      }),
    ).resolves.toEqual({ result: 42, status: 'processed' })
    expect(successful.complete).toHaveBeenCalledWith('attempt-1')
    expect(successful.abandon).not.toHaveBeenCalled()

    const failed = coordinator()
    const error = new Error('failed after claiming')
    await expect(
      serialization.delivery(namespace(failed).binding, {
        id: 'delivery-2',
        operation: async () => {
          throw error
        },
        owner: 'attempt-2',
      }),
    ).rejects.toBe(error)
    expect(failed.abandon).toHaveBeenCalledWith('attempt-2')
    expect(failed.complete).not.toHaveBeenCalled()
  })
})

describe('repositories', () => {
  test('behavior: a mutation holds and releases its normalized repository lease', async () => {
    const lock = coordinator()
    const { binding, getByName } = namespace(lock)
    const serialize = serialization.repositories(binding, 'delivery-1')

    await expect(serialize('Wevm/Frog', async () => 42)).resolves.toBe(42)
    expect(getByName).toHaveBeenCalledWith('repository:wevm/frog')
    expect(lock.acquire).toHaveBeenCalledOnce()
    expect(lock.release).toHaveBeenCalledWith(expect.stringContaining('delivery-1:'))
  })

  test('behavior: lock contention prevents a conflicting mutation', async () => {
    const operation = vi.fn(async () => 42)
    const lock = coordinator({ acquire: vi.fn(async () => false) })
    const serialize = serialization.repositories(namespace(lock).binding, 'delivery-2')

    await expect(serialize('wevm/frog', operation)).rejects.toThrow(
      serialization.RepositoryBusyError,
    )
    expect(operation).not.toHaveBeenCalled()
    expect(lock.release).not.toHaveBeenCalled()
  })

  test('behavior: failure still releases the lease', async () => {
    const error = new Error('mutation failed')
    const lock = coordinator()
    const serialize = serialization.repositories(namespace(lock).binding, 'delivery-3')

    await expect(
      serialize('wevm/frog', async () => {
        throw error
      }),
    ).rejects.toBe(error)
    expect(lock.release).toHaveBeenCalledOnce()
  })
})
