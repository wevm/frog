/** How long an active delivery or repository mutation owns its lease. */
export const lease = 15 * 60 * 1_000

/** Retains delivery ids past GitHub's three-day manual-redelivery window. */
export const retention = 7 * 24 * 60 * 60 * 1_000

/** State held by one deterministically named coordinator object. */
export type State =
  | {
      expiresAt: number
      kind: 'delivery'
      owner: string
      status: 'processing'
    }
  | {
      kind: 'delivery'
      status: 'completed'
    }
  | {
      expiresAt: number
      kind: 'repository'
      owner: string
    }

/** A state transition and the result returned to its caller. */
export type Transition<Result> = {
  result: Result
  state: State | undefined
}

/** Claims a delivery unless it is already complete or another live attempt owns it. */
export function claim(
  current: State | undefined,
  options: { now: number; owner: string },
): Transition<'claimed' | 'completed' | 'processing'> {
  if (current?.kind === 'repository') throw new Error('Repository coordinator used for a delivery.')
  if (current?.status === 'completed') return { result: 'completed', state: current }
  if (current && current.expiresAt > options.now) return { result: 'processing', state: current }

  return {
    result: 'claimed',
    state: {
      expiresAt: options.now + lease,
      kind: 'delivery',
      owner: options.owner,
      status: 'processing',
    },
  }
}

/** Marks a claimed delivery complete, if the caller still owns it. */
export function complete(current: State | undefined, owner: string): Transition<boolean> {
  if (current?.kind !== 'delivery') return { result: false, state: current }
  if (current.status === 'completed') return { result: true, state: current }
  if (current.owner !== owner) return { result: false, state: current }
  return { result: true, state: { kind: 'delivery', status: 'completed' } }
}

/** Releases a failed delivery claim without disturbing a newer attempt. */
export function abandon(current: State | undefined, owner: string): State | undefined {
  if (current?.kind !== 'delivery' || current.status !== 'processing') return current
  return current.owner === owner ? undefined : current
}

/** Acquires an expired or absent repository mutation lease. */
export function acquire(
  current: State | undefined,
  options: { now: number; owner: string },
): Transition<boolean> {
  if (current?.kind === 'delivery')
    throw new Error('Delivery coordinator used as a repository lock.')
  if (current && current.expiresAt > options.now) return { result: false, state: current }

  return {
    result: true,
    state: {
      expiresAt: options.now + lease,
      kind: 'repository',
      owner: options.owner,
    },
  }
}

/** Releases a repository mutation lease without disturbing a newer owner. */
export function release(current: State | undefined, owner: string): State | undefined {
  if (current?.kind !== 'repository') return current
  return current.owner === owner ? undefined : current
}
