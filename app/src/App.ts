import { App, type Octokit } from 'octokit'
import { issues } from './handlers/issues.js'
import { pullRequest } from './handlers/pullRequest.js'
import * as serialization from './internal/serialize.js'

/**
 * Builds the App and registers every handler.
 *
 * The resolver below mints a token per installation on demand. A repository with no installation
 * resolves to `undefined`, so the App cannot file where it has not been installed.
 *
 * Handlers are allowed to throw. A delivery claim completes only after the handler succeeds, and replay
 * markers keep a repeated external mutation from duplicating an issue or comment.
 */
export function runtime(options: create.Options): Runtime {
  const { appId, coordinator, privateKey, registry, secret } = options

  const app = new App({ appId, privateKey, webhooks: { secret } })

  /** Installation clients by repository. Only hits are cached, so installing later still works. */
  const clients = new Map<string, Octokit>()

  async function installation(repo: string): Promise<Octokit | undefined> {
    const cached = clients.get(repo)
    if (cached) return cached

    const [owner = '', name = ''] = repo.split('/')
    try {
      const found = await app.octokit.rest.apps.getRepoInstallation({ owner, repo: name })
      const client = await app.getInstallationOctokit(found.data.id)
      clients.set(repo, client)
      return client
    } catch (error) {
      if ((error as { status?: number }).status === 404) return undefined
      throw error
    }
  }

  /** This App's bot login, used to trust only App-owned issues and comments. */
  let identity: string | undefined
  async function self(): Promise<string> {
    if (identity) return identity
    const authenticated = await app.octokit.rest.apps.getAuthenticated()
    if (!authenticated.data?.slug) throw new Error('The GitHub App has no slug.')
    identity = `${authenticated.data.slug}[bot]`
    return identity
  }

  const serialize = (delivery: string) => serialization.repositories(coordinator, delivery)

  app.webhooks.on(
    ['pull_request.opened', 'pull_request.reopened', 'pull_request.synchronize'],
    async ({ id, octokit, payload }) => {
      const author = payload.pull_request.user?.login
      await pullRequest({
        app: await self(),
        ...(author ? { actor: `@${author}` } : {}),
        base: payload.repository.full_name,
        baseRef: payload.pull_request.base.ref,
        client: octokit,
        head: payload.pull_request.head.sha,
        installation,
        pr: payload.number,
        ...(registry ? { registry } : {}),
        serialize: serialize(id),
      })
    },
  )

  app.webhooks.on(['issues.closed', 'issues.reopened'], async ({ id, octokit, payload }) => {
    const hydrated = payload.issue as typeof payload.issue & { author?: string | undefined }
    const author = hydrated.author ?? payload.issue.user?.login
    await issues({
      app: await self(),
      client: octokit,
      delivery: id,
      installation,
      issue: {
        ...(author ? { author } : {}),
        body: payload.issue.body,
        // The delivered array can hold nulls.
        labels: (payload.issue.labels ?? []).filter(
          (label): label is NonNullable<typeof label> => label !== null,
        ),
        number: payload.issue.number,
        // Taken from the action rather than the payload field, which is optional in the delivered
        // shape.
        state: payload.action === 'closed' ? 'closed' : 'open',
        title: payload.issue.title,
      },
      repo: payload.repository.full_name,
      serialize: serialize(id),
    })
  })

  return { app, installation, self }
}

/** Builds the Octokit App used by tests and webhook-only consumers. */
export function create(options: create.Options): App {
  return runtime(options).app
}

/** App instance plus the authenticated operations used outside webhook dispatch. */
export type Runtime = {
  /** Registered Octokit App. */
  app: App
  /** Resolves an installation client for one repository. */
  installation: (repo: string) => Promise<Octokit | undefined>
  /** Authenticated bot login. */
  self: () => Promise<string>
}

export declare namespace create {
  /** Options for {@link create}. */
  type Options = {
    /** GitHub App id. */
    appId: number | string
    /** Durable coordinator binding for delivery and repository serialization. */
    coordinator: serialization.Namespace
    /** GitHub App private key, PEM encoded. */
    privateKey: string
    /** Registry base URL. Overridden in tests. */
    registry?: string | undefined
    /** Webhook secret, used to verify every delivery. */
    secret: string
  }
}
