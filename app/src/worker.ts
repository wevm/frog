import { create } from './App.js'

/** Bindings the Worker needs, set as secrets. */
export type Env = {
  /** GitHub App id. */
  APP_ID: string
  /** GitHub App private key, PEM encoded. Newlines may be escaped as `\n`. */
  PRIVATE_KEY: string
  /** Webhook secret, used to verify every delivery. */
  WEBHOOK_SECRET: string
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
    // Newlines do not survive an environment variable, so they are restored here.
    privateKey: env.PRIVATE_KEY.replace(/\\n/g, '\n'),
    secret: env.WEBHOOK_SECRET,
  })
  apps.set(env.APP_ID, created)
  return created
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

    try {
      await app(env).webhooks.verifyAndReceive({
        id,
        // The delivered event set is wider than what is registered; unregistered names are ignored.
        name: name as 'push',
        payload: await request.text(),
        signature,
      })
    } catch (error) {
      // GitHub redelivers a failed delivery, and every handler is idempotent, so a 500 is the correct
      // way to ask for that retry.
      console.error(error)
      return new Response('Internal Server Error', { status: 500 })
    }

    return Response.json({ ok: true })
  },
}
