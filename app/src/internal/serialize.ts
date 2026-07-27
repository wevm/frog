import type { WebhookCoordinator } from '../WebhookCoordinator.js'

/** Runs one mutation while holding its repository's coordinator lease. */
export type Serialize = <Result>(repo: string, operation: () => Promise<Result>) => Promise<Result>

/** The coordinator RPC surface used by the Worker and its tests. */
export type Coordinator = Pick<
  WebhookCoordinator,
  'abandon' | 'acquire' | 'claim' | 'complete' | 'release'
>

/** A typed subset of the Durable Object namespace binding. */
export type Namespace = {
  getByName(name: string): Coordinator
}

/** Thrown when another delivery already owns a conflicting repository mutation. */
export class RepositoryBusyError extends Error {
  override readonly name = 'RepositoryBusyError'

  constructor(repo: string) {
    super(`Another webhook delivery is mutating \`${repo}\`.`)
  }
}

/** Runs a delivery once, preserving completed ids across Worker restarts. */
export async function delivery<Result>(
  namespace: Namespace,
  options: {
    id: string
    operation: () => Promise<Result>
    owner?: string | undefined
  },
): Promise<{ status: 'completed' | 'processing' } | { result: Result; status: 'processed' }> {
  const owner = options.owner ?? crypto.randomUUID()
  const coordinator = namespace.getByName(`delivery:${options.id}`)
  const claim = await coordinator.claim(owner)
  if (claim !== 'claimed') return { status: claim }

  try {
    const result = await options.operation()
    if (!(await coordinator.complete(owner)))
      throw new Error(`Delivery \`${options.id}\` lost its processing lease.`)
    return { result, status: 'processed' }
  } catch (error) {
    await coordinator.abandon(owner)
    throw error
  }
}

/** Builds a serializer whose locks are scoped to one webhook delivery. */
export function repositories(namespace: Namespace, delivery: string): Serialize {
  const owner = `${delivery}:${crypto.randomUUID()}`

  return async (repo, operation) => {
    const coordinator = namespace.getByName(`repository:${repo.toLowerCase()}`)
    if (!(await coordinator.acquire(owner))) throw new RepositoryBusyError(repo)

    try {
      return await operation()
    } finally {
      await coordinator.release(owner)
    }
  }
}

/** Direct execution for CLI calls and focused handler tests. */
export const direct: Serialize = (_repo, operation) => operation()
