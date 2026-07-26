import * as Delivery from '../Delivery.js'

const maximumDelay = 60 * 60

/** Retry delay for one failed Queue attempt, with a one-hour ceiling. */
export function retryDelay(attempts: number): number {
  return Math.min(30 * 2 ** Math.max(0, attempts - 1), maximumDelay)
}

/** Processes a Queue batch one message at a time with explicit acknowledgement and retry. */
export async function consume(
  messages: readonly consume.Message[],
  options: consume.Options,
): Promise<void> {
  for (const message of messages) {
    try {
      const delivery = Delivery.fromQueue(message.body)
      const result = await options.process(delivery)
      if (result.status === 'processing') {
        // The active owner can still fail. Preserve this duplicate until that lease completes or
        // expires instead of acknowledging the only attempt capable of recovery.
        message.retry({ delaySeconds: retryDelay(message.attempts) })
      } else {
        message.ack()
      }
    } catch (error) {
      const value =
        message.body && typeof message.body === 'object'
          ? (message.body as { id?: unknown; name?: unknown })
          : undefined
      options.error?.(error, {
        attempt: message.attempts,
        ...(typeof value?.id === 'string' ? { delivery: value.id } : {}),
        ...(typeof value?.name === 'string' ? { event: value.name } : {}),
      })
      message.retry({ delaySeconds: retryDelay(message.attempts) })
    }
  }
}

export declare namespace consume {
  type Message = {
    /** Explicitly acknowledges successful processing. */
    ack: () => void
    /** Number of times Queue has delivered this message. */
    attempts: number
    /** Versioned delivery body. Treated as untrusted across deployments. */
    body: unknown
    /** Explicitly schedules another attempt. */
    retry: (options: { delaySeconds: number }) => void
  }

  type Options = {
    /** Reports a failed attempt without exposing the queued payload. */
    error?: (
      error: unknown,
      context: {
        attempt: number
        delivery?: string | undefined
        event?: string | undefined
      },
    ) => void
    /** Claims and dispatches one validated delivery. */
    process: (
      delivery: Delivery.Delivery,
    ) => Promise<{ status: 'completed' | 'processed' | 'processing' }>
  }
}
