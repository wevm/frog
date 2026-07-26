import { create } from './App.js'
import { WebhookCoordinator } from './WebhookCoordinator.js'
import * as serialization from './internal/serialize.js'

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
}

/**
 * Cached across requests in a warm isolate, so a burst of deliveries mints one set of tokens.
 *
 * Keyed by app id, so a redeployment with different bindings cannot reuse the wrong App.
 */
const apps = new Map<string, ReturnType<typeof create>>()

function app(env: Env): ReturnType<typeof create> {
  const cached = apps.get(env.APP_ID)
  if (cached) return cached

  const created = create({
    appId: env.APP_ID,
    coordinator: env.COORDINATOR,
    // Newlines do not survive an environment variable, so they are restored here.
    privateKey: env.PRIVATE_KEY.replace(/\\n/g, '\n'),
    secret: env.WEBHOOK_SECRET,
  })
  apps.set(env.APP_ID, created)
  return created
}

/** A verified event accepted by Octokit's webhook dispatcher. */
export type Delivery = Parameters<ReturnType<typeof create>['webhooks']['receive']>[0]

/** Dispatches one verified delivery behind its persistent idempotency claim. */
export function processDelivery(env: Env, event: Delivery) {
  return serialization.delivery(env.COORDINATOR, {
    id: event.id,
    operation: () => app(env).webhooks.receive(event),
  })
}

/**
 * Receives webhook deliveries.
 *
 * Deliveries are verified and dispatched directly rather than through `createNodeMiddleware`, which
 * mounts its own routes under a path prefix and would fight a single endpoint. `request.text()` gives
 * the exact bytes GitHub signed; a parsed body re-serialized would not reliably match.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

    const id = request.headers.get('x-github-delivery')
    const name = request.headers.get('x-github-event')
    const signature = request.headers.get('x-hub-signature-256')
    if (!id || !name || !signature) return new Response('Bad Request', { status: 400 })

    const body = await request.text()
    if (!(await app(env).webhooks.verify(body, signature)))
      return new Response('Bad Request', { status: 400 })

    let payload: unknown
    try {
      payload = JSON.parse(body)
    } catch {
      return new Response('Bad Request', { status: 400 })
    }

    try {
      // The signature proves the payload came from GitHub. Octokit validates and routes the event name.
      const event = { id, name, payload } as Delivery
      const result = await processDelivery(env, event)
      return Response.json({ ok: true }, { status: result.status === 'processing' ? 202 : 200 })
    } catch (error) {
      console.error(error)
      return new Response('Internal Server Error', { status: 500 })
    }
  },
}

export { WebhookCoordinator }
