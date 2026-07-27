import * as Delivery from '../Delivery.js'
import * as serialization from './serialize.js'

/**
 * Claims a queued delivery before expanding or dispatching it.
 *
 * Completed and concurrently processing duplicates are decided before expansion, which may perform
 * GitHub reads. The expanded event must retain the original GitHub delivery id.
 */
export function queued(
  namespace: serialization.Namespace,
  delivery: Delivery.Delivery,
  options: queued.Options,
) {
  return serialization.delivery(namespace, {
    id: delivery.id,
    operation: async () => {
      const event = await options.expand(delivery)
      if (event.id !== delivery.id)
        throw new Error(`Expanded delivery id changed from \`${delivery.id}\` to \`${event.id}\`.`)
      await options.receive(event)
    },
  })
}

export declare namespace queued {
  type Options = {
    /** Expands the compact projection after its claim is acquired. */
    expand: (delivery: Delivery.Delivery) => Promise<Delivery.Event>
    /** Dispatches the expanded event through Octokit's registered handlers. */
    receive: (event: Delivery.Event) => Promise<void>
  }
}
