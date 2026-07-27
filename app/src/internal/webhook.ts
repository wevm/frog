import * as Delivery from '../Delivery.js'

/** Verifies and durably enqueues one supported webhook delivery. */
export async function receive(request: Request, options: receive.Options): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  const id = request.headers.get('x-github-delivery')
  const name = request.headers.get('x-github-event')
  const signature = request.headers.get('x-hub-signature-256')
  if (!id || !name || !signature) return new Response('Bad Request', { status: 400 })

  const body = await request.text()
  if (!(await options.verify(body, signature))) return new Response('Unauthorized', { status: 401 })

  // GitHub sends many event actions the App does not subscribe to. A verified unsupported delivery is
  // accepted without parsing or queueing.
  if (!Delivery.supports(name))
    return Response.json({ accepted: true, queued: false }, { status: 202 })

  let payload: unknown
  try {
    payload = JSON.parse(body)
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  let delivery: Delivery.Delivery | undefined
  try {
    delivery = Delivery.fromWebhook({ id, name, payload })
  } catch (error) {
    if (error instanceof Delivery.InvalidError) return new Response('Bad Request', { status: 400 })
    throw error
  }

  if (!delivery) return Response.json({ accepted: true, queued: false }, { status: 202 })
  if (Delivery.bytes(delivery) > Delivery.maxBytes)
    return new Response('Payload Too Large', { status: 413 })

  // Awaiting this write is the durability boundary. Returning before Queue accepts the message loses
  // the delivery: GitHub does not automatically redeliver failed webhooks.
  try {
    await options.enqueue(delivery)
  } catch (error) {
    options.error?.(error, { delivery: id, event: name })
    return new Response('Service Unavailable', { status: 503 })
  }
  return Response.json({ accepted: true, queued: true }, { status: 202 })
}

export declare namespace receive {
  type Options = {
    /** Persists a compact delivery in Cloudflare Queue. */
    enqueue: (delivery: Delivery.Delivery) => Promise<unknown>
    /** Reports an enqueue failure without exposing the payload or signature. */
    error?: (error: unknown, context: { delivery: string; event: string }) => void
    /** Verifies the exact request bytes against GitHub's signature. */
    verify: (body: string, signature: string) => Promise<boolean>
  }
}
