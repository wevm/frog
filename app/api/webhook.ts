import { create } from '../src/App.js'

/**
 * Webhook endpoint.
 *
 * Written against the Fetch API rather than a Node request. Signature verification needs the exact
 * bytes GitHub sent, and `request.text()` gives them; a pre-parsed body re-serialized would not
 * necessarily match. It also keeps this portable across Vercel, Cloudflare, Deno, and Bun.
 *
 * Deliveries are received directly instead of through `createNodeMiddleware`, which mounts its own
 * routes under a path prefix and would fight a single endpoint.
 */
function env(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set.`)
  return value
}

const app = create({
  appId: env('APP_ID'),
  // Newlines survive an environment variable as `\n`, so they are restored here.
  privateKey: env('PRIVATE_KEY').replace(/\\n/g, '\n'),
  secret: env('WEBHOOK_SECRET'),
})

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  const id = request.headers.get('x-github-delivery')
  const name = request.headers.get('x-github-event')
  const signature = request.headers.get('x-hub-signature-256')
  if (!id || !name || !signature) return new Response('Bad Request', { status: 400 })

  try {
    await app.webhooks.verifyAndReceive({
      id,
      // The union of event names is wider than what is registered; unregistered ones are ignored.
      name: name as 'push',
      payload: await request.text(),
      signature,
    })
  } catch (error) {
    // A failed delivery is redelivered by GitHub. Every handler is idempotent, so that is safe, and a
    // 500 is the correct way to ask for the retry.
    console.error(error)
    return new Response('Internal Server Error', { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'content-type': 'application/json' },
  })
}
