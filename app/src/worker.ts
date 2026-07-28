import { Github } from 'frog'
import { runtime, type Runtime } from './App.js'
import * as Delivery from './Delivery.js'
import * as Reconcile from './Reconcile.js'
import { WebhookCoordinator } from './WebhookCoordinator.js'
import * as dispatch from './internal/dispatch.js'
import * as oidc from './internal/oidc.js'
import * as deliveryQueue from './internal/queue.js'
import * as serialization from './internal/serialize.js'
import * as webhook from './internal/webhook.js'

const reconcilePath = '/github/reconcile'
const reconcileAudience = 'https://frog.wevm.dev/github/reconcile'
const webhookPath = '/github'

function failure(error: unknown): { name: string; status?: number | undefined } {
  const value = error as { name?: unknown; status?: unknown }
  return {
    name: typeof value.name === 'string' ? value.name : 'UnknownError',
    ...(typeof value.status === 'number' ? { status: value.status } : {}),
  }
}

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
const apps = new Map<string, Runtime>()

function app(env: Env): Runtime {
  const cached = apps.get(env.APP_ID)
  if (cached) return cached

  const created = runtime({
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
export type WebhookEvent = Parameters<Runtime['app']['webhooks']['receive']>[0]

function runDelivery<Result>(env: Env, id: string, operation: () => Promise<Result>) {
  return serialization.delivery(env.COORDINATOR, { id, operation })
}

/** Dispatches one verified delivery behind its persistent idempotency claim. */
export function processDelivery(env: Env, event: WebhookEvent) {
  return runDelivery(env, event.id, () => app(env).app.webhooks.receive(event))
}

async function processQueued(env: Env, delivery: Delivery.Delivery) {
  return dispatch.queued(env.COORDINATOR, delivery, {
    expand: (queued) =>
      Delivery.toEvent(queued, {
        issue: async (reference) => {
          const client = await app(env).app.getInstallationOctokit(reference.installation)
          const issue = await Github.get(client.rest, {
            issue: reference.issue,
            repo: reference.repo,
          })
          if (!issue) throw new Error('The queued issue no longer exists.')
          return issue
        },
      }),
    // The projection contains only the fields our handlers read. Keep the OpenAPI escape hatch at this
    // one boundary rather than letting unvalidated payloads flow through the App.
    receive: (event) => app(env).app.webhooks.receive(event as unknown as WebhookEvent),
  })
}

async function reconcile(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST')
    return new Response('Method Not Allowed', {
      headers: { allow: 'POST', 'cache-control': 'no-store' },
      status: 405,
    })
  if (request.body !== null)
    return new Response('Bad Request', {
      headers: { 'cache-control': 'no-store' },
      status: 400,
    })

  const token = bearer(request.headers.get('authorization'))
  if (!token)
    return new Response('Unauthorized', {
      headers: { 'cache-control': 'no-store' },
      status: 401,
    })

  try {
    const claims = await oidc.verify(token, {
      audience: reconcileAudience,
    })
    const processed = await runDelivery(env, `oidc:${await digest(token)}`, async () => {
      const application = app(env)
      const client = await application.installation(claims.repository)
      if (!client) throw new ForbiddenError()

      const coordinates = Github.split(claims.repository)
      const metadata = await client.rest.repos.get(coordinates)
      if (!metadata.data.default_branch) throw new ForbiddenError()

      const ref = `refs/heads/${metadata.data.default_branch}`
      oidc.bind(claims, {
        ref,
        repository: metadata.data.full_name,
        repositoryId: `${metadata.data.id}`,
      })
      const current = await client.rest.git.getRef({
        ...coordinates,
        ref: `heads/${metadata.data.default_branch}`,
      })
      if (current.data.object.sha !== claims.sha) throw new StaleError()

      return Reconcile.reconcile({
        app: await application.self(),
        client,
        installation: application.installation,
        repo: claims.repository,
        repositoryId: metadata.data.id,
        serialize: serialization.repositories(
          env.COORDINATOR,
          `reconcile:${claims.repository_id}:${claims.sha}`,
        ),
        sha: claims.sha,
      })
    })
    if (processed.status !== 'processed') return conflict()
    return Response.json(processed.result, {
      headers: { 'cache-control': 'no-store' },
    })
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof oidc.InvalidError) return forbidden()
    if (error instanceof StaleError) return conflict()
    console.error('Reconciliation failed.', failure(error))
    return new Response('Service Unavailable', {
      headers: { 'cache-control': 'no-store' },
      status: 503,
    })
  }
}

async function digest(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function bearer(value: string | null): string | undefined {
  const match = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(value ?? '')
  return match?.[1]
}

function forbidden(): Response {
  return new Response('Forbidden', {
    headers: { 'cache-control': 'no-store' },
    status: 403,
  })
}

function conflict(): Response {
  return new Response('Conflict', {
    headers: { 'cache-control': 'no-store' },
    status: 409,
  })
}

class ForbiddenError extends Error {
  override name = 'ForbiddenError'
}

class StaleError extends Error {
  override name = 'StaleError'
}

/**
 * Accepts and consumes webhook deliveries.
 *
 * Fetch verifies the exact signed bytes and durably enqueues a compact projection. Queue claims each
 * delivery before expanding and dispatching it through Octokit's registered handlers.
 */
const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname
    if (path === reconcilePath) return reconcile(request, env)
    if (path !== webhookPath) return new Response('Not Found', { status: 404 })

    const id = request.headers.get('x-github-delivery')
    const name = request.headers.get('x-github-event')
    try {
      return await webhook.receive(request, {
        enqueue: (delivery) => env.WEBHOOKS.send(delivery, { contentType: 'json' }),
        error: (error, context) =>
          console.error('Webhook enqueue failed.', context, failure(error)),
        verify: (body, signature) => app(env).app.webhooks.verify(body, signature),
      })
    } catch (error) {
      console.error('Webhook ingress failed.', { delivery: id, event: name }, failure(error))
      return new Response('Service Unavailable', { status: 503 })
    }
  },

  async queue(batch: MessageBatch<Delivery.Delivery>, env: Env): Promise<void> {
    await deliveryQueue.consume(batch.messages, {
      error: (error, context) =>
        console.error('Webhook processing failed.', context, failure(error)),
      process: (delivery) => processQueued(env, delivery),
    })
  },
} satisfies ExportedHandler<Env, Delivery.Delivery>

export { WebhookCoordinator }
export default worker
