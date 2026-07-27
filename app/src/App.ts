import { App, type Octokit } from 'octokit'
import { issues } from './handlers/issues.js'
import { pullRequest } from './handlers/pullRequest.js'
import { push } from './handlers/push.js'
import * as serialization from './internal/serialize.js'

/**
 * Builds the App and registers every handler.
 *
 * Cross-repo filing needs a token per installation, so the resolver below mints one on demand. A
 * repository with no installation resolves to `undefined`, and that is the consent gate: the App
 * physically cannot file where it has not been installed.
 *
 * Handlers are allowed to throw. Delivery claims are only completed after the handler succeeds, and
 * replay markers keep a repeated external mutation from duplicating an issue or comment.
 */
export function create(options: create.Options): App {
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

  /** This App's own bot login, for ignoring its own pushes. */
  let identity: string | undefined
  async function self(): Promise<string | undefined> {
    if (identity) return identity
    const authenticated = await app.octokit.rest.apps.getAuthenticated().catch(() => undefined)
    identity = authenticated?.data?.slug ? `${authenticated.data.slug}[bot]` : undefined
    return identity
  }

  const serialize = (delivery: string) => serialization.repositories(coordinator, delivery)

  app.webhooks.on(
    ['pull_request.opened', 'pull_request.reopened', 'pull_request.synchronize'],
    async ({ id, octokit, payload }) => {
      const author = payload.pull_request.user?.login
      await pullRequest({
        ...(author ? { actor: `@${author}` } : {}),
        base: payload.repository.full_name,
        baseRef: payload.pull_request.base.ref,
        client: octokit,
        head: payload.pull_request.head.sha,
        headRef: payload.pull_request.head.ref,
        headRepo: payload.pull_request.head.repo?.full_name ?? null,
        installation,
        pr: payload.number,
        ...(registry ? { registry } : {}),
        serialize: serialize(id),
      })
    },
  )

  app.webhooks.on('push', async ({ id, octokit, payload }) => {
    const branch = payload.repository.default_branch
    // Only the default branch: a topic branch's entries are handled as a pull request.
    if (payload.ref !== `refs/heads/${branch}`) return

    // The write-back is self-terminating anyway, but skipping our own push saves a pointless round
    // trip on every commit this App makes.
    if (payload.sender?.login && payload.sender.login === (await self())) return

    await push({
      branch,
      client: octokit,
      installation,
      repo: payload.repository.full_name,
      ...(registry ? { registry } : {}),
      serialize: serialize(id),
    })
  })

  app.webhooks.on(
    ['issues.closed', 'issues.edited', 'issues.reopened'],
    async ({ id, octokit, payload }) => {
      await issues({
        client: octokit,
        installation,
        issue: {
          body: payload.issue.body,
          // The delivered array can hold nulls.
          labels: (payload.issue.labels ?? []).filter(
            (label): label is NonNullable<typeof label> => label !== null,
          ),
          number: payload.issue.number,
          // Taken from the action rather than the payload field: the action is what happened, and the
          // field is optional in the delivered shape.
          state: payload.action === 'closed' ? 'closed' : 'open',
          title: payload.issue.title,
        },
        repo: payload.repository.full_name,
        serialize: serialize(id),
      })
    },
  )

  return app
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
