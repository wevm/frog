import { Github } from 'frog'
import { create } from './App.js'
import * as Delivery from './Delivery.js'
import { WebhookCoordinator } from './WebhookCoordinator.js'
import * as dispatch from './internal/dispatch.js'
import * as deliveryQueue from './internal/queue.js'
import * as serialization from './internal/serialize.js'
import * as webhook from './internal/webhook.js'

/** Bindings the Worker needs, set as secrets. */
export type Env = {
  /** GitHub App id. */
  APP_ID: string
  /** GitHub App private key, PEM encoded. Newlines may be escaped as `\n`. */
  PRIVATE_KEY: string
  /** Webhook secret, used to verify every delivery. */
  WEBHOOK_SECRET: string
  /** Persistent delivery claims and repository mutation leases. */
  COORDINATOR: serialization.Namespace
  /** Durable queue of verified, compact webhook deliveries. */
  WEBHOOKS: Queue<Delivery.Delivery>
}

/**
 * Apps cached across requests in a warm isolate. A burst of deliveries mints one set of tokens.
 *
 * Keyed by app id: a redeployment with different bindings cannot reuse the wrong App.
 */
const apps = new Map<string, ReturnType<typeof create>>()

function app(env: Env): ReturnType<typeof create> {
  const cached = apps.get(env.APP_ID)
  if (cached) return cached

  const created = create({
    appId: env.APP_ID,
    coordinator: env.COORDINATOR,
    // Restore newlines, which do not survive an environment variable.
    privateKey: env.PRIVATE_KEY.replace(/\\n/g, '\n'),
    secret: env.WEBHOOK_SECRET,
  })
  apps.set(env.APP_ID, created)
  return created
}

/** A verified event accepted by Octokit's webhook dispatcher. */
export type WebhookEvent = Parameters<ReturnType<typeof create>['webhooks']['receive']>[0]

function runDelivery(env: Env, id: string, operation: () => Promise<void>) {
  return serialization.delivery(env.COORDINATOR, { id, operation })
}

/** Dispatches one verified delivery behind its persistent idempotency claim. */
export function processDelivery(env: Env, event: WebhookEvent) {
  return runDelivery(env, event.id, () => app(env).webhooks.receive(event))
}

async function processQueued(env: Env, delivery: Delivery.Delivery) {
  return dispatch.queued(env.COORDINATOR, delivery, {
    expand: (queued) =>
      Delivery.toEvent(queued, {
        issue: async (reference) => {
          const client = await app(env).getInstallationOctokit(reference.installation)
          const response = await client.rest.issues.get({
            ...Github.split(reference.repo),
            issue_number: reference.issue,
          })
          return response.data
        },
      }),
    // The projection contains only the fields our handlers read. Keep the OpenAPI escape hatch at this
    // one boundary rather than letting unvalidated payloads flow through the App.
    receive: (event) => app(env).webhooks.receive(event as unknown as WebhookEvent),
  })
}

/**
 * Accepts and consumes webhook deliveries.
 *
 * Fetch verifies the exact signed bytes and durably enqueues a compact projection. Queue claims each
 * delivery before expanding and dispatching it through Octokit's registered handlers.
 */
const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const id = request.headers.get('x-github-delivery')
    const name = request.headers.get('x-github-event')
    try {
      return await webhook.receive(request, {
        enqueue: (delivery) => env.WEBHOOKS.send(delivery, { contentType: 'json' }),
        error: (error, context) => console.error('Webhook enqueue failed.', context, error),
        verify: (body, signature) => app(env).webhooks.verify(body, signature),
      })
    } catch (error) {
      console.error('Webhook ingress failed.', { delivery: id, event: name }, error)
      return new Response('Service Unavailable', { status: 503 })
    }
  },

  async queue(batch: MessageBatch<Delivery.Delivery>, env: Env): Promise<void> {
    await deliveryQueue.consume(batch.messages, {
      error: (error, context) => console.error('Webhook processing failed.', context, error),
      process: (delivery) => processQueued(env, delivery),
    })
  },
} satisfies ExportedHandler<Env, Delivery.Delivery>

export { WebhookCoordinator }
export default worker
