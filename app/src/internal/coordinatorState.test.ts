import * as coordinator from './coordinatorState.js'

describe('delivery state', () => {
  test('behavior: a live claim excludes another attempt and expires', () => {
    const first = coordinator.claim(undefined, { now: 100, owner: 'first' })

    expect(first.result).toBe('claimed')
    expect(coordinator.claim(first.state, { now: 101, owner: 'second' }).result).toBe('processing')

    const reclaimed = coordinator.claim(first.state, {
      now: 100 + coordinator.lease,
      owner: 'second',
    })
    expect(reclaimed).toMatchObject({
      result: 'claimed',
      state: { kind: 'delivery', owner: 'second', status: 'processing' },
    })
  })

  test('behavior: only the current owner can complete or abandon a claim', () => {
    const claimed = coordinator.claim(undefined, { now: 100, owner: 'first' }).state

    expect(coordinator.complete(claimed, 'second')).toEqual({
      result: false,
      state: claimed,
    })
    expect(coordinator.abandon(claimed, 'second')).toBe(claimed)

    const completed = coordinator.complete(claimed, 'first')
    expect(completed).toEqual({
      result: true,
      state: { kind: 'delivery', status: 'completed' },
    })
    expect(coordinator.claim(completed.state, { now: 1_000, owner: 'second' }).result).toBe(
      'completed',
    )
  })
})

describe('repository state', () => {
  test('behavior: a live lease excludes another mutation and expires', () => {
    const first = coordinator.acquire(undefined, { now: 100, owner: 'first' })

    expect(first.result).toBe(true)
    expect(coordinator.acquire(first.state, { now: 101, owner: 'second' }).result).toBe(false)
    expect(
      coordinator.acquire(first.state, {
        now: 100 + coordinator.lease,
        owner: 'second',
      }),
    ).toMatchObject({
      result: true,
      state: { kind: 'repository', owner: 'second' },
    })
  })

  test('behavior: only the current owner can release a lease', () => {
    const acquired = coordinator.acquire(undefined, { now: 100, owner: 'first' }).state

    expect(coordinator.release(acquired, 'second')).toBe(acquired)
    expect(coordinator.release(acquired, 'first')).toBeUndefined()
  })
})
