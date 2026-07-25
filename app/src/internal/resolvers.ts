import { Config, Github, Manifest, type Target } from 'frictionsets'
import type { Octokit } from 'octokit'
import * as cache from './cache.js'

/** Where the npm registry serves package metadata. */
export const registry = 'https://registry.npmjs.org'

/**
 * Reads a package's manifest from the npm registry.
 *
 * The App has no `node_modules` to inspect, so the offline path the CLI uses does not exist here. The
 * registry preserves non-standard top-level fields, so `frictionsets` survives publication and the same
 * consent data is available over HTTP.
 *
 * Resolved at `latest` rather than the version a consumer has pinned. Whether a project accepts friction
 * is not something that varies by patch release, and resolving a range here would mean reading the
 * consumer's lockfile.
 *
 * @param name - npm package name.
 * @returns The manifest, or `undefined` when the package declares none.
 */
export async function fromRegistry(
  name: string,
  options: { timeout?: number | undefined; url?: string | undefined } = {},
): Promise<Manifest.Manifest | undefined> {
  const { timeout = 5_000, url = registry } = options

  // Only the slash is escaped: the registry expects `@scope%2Fname`, not a fully encoded path.
  const response = await globalThis
    .fetch(`${url}/${name.replace('/', '%2F')}/latest`, { signal: AbortSignal.timeout(timeout) })
    .catch(() => undefined)
  if (!response?.ok) return undefined

  const document = (await response.json().catch(() => undefined)) as
    | { frictionsets?: unknown }
    | undefined
  if (!document?.frictionsets) return undefined

  const manifest = Manifest.from(document.frictionsets)
  return manifest ? Manifest.named(manifest, name) : undefined
}

/**
 * Builds the resolver stack `Target.resolve` needs, backed by the API and the registry.
 *
 * The same three lookups the CLI supplies from disk, over the network instead. Every consent gate is
 * unchanged, which is the point of `Target` taking them as arguments.
 */
export function resolvers(options: resolvers.Options): Target.resolve.Options {
  const { allowedRepos, cache: store = cache.memory(), client, registry: url, self } = options

  return {
    allowedRepos,
    async readConfig(repo) {
      const contents = await Github.fetchFile(client.rest, { path: Config.file, repo }).catch(
        () => undefined,
      )
      if (!contents) return undefined
      try {
        return Config.from(JSON.parse(contents)).inbound
      } catch {
        return undefined
      }
    },
    // In memory: there is no filesystem here, and an isolate stays warm across deliveries.
    readHost: (host) => Manifest.fetchDocument(host, { cache: store }),
    readPackage: (name) => fromRegistry(name, ...(url ? [{ url }] : [])),
    self,
  }
}

export declare namespace resolvers {
  /** Options for {@link resolvers}. */
  type Options = {
    /** Targets the sender may file against, from its base-branch config. */
    allowedRepos: readonly string[]
    /** Where to keep fetched well-known documents. Defaults to a fresh in-memory store. */
    cache?: Manifest.Cache | undefined
    /** Installation client for the sender repository. */
    client: Octokit
    /** Registry base URL. Overridden in tests. */
    registry?: string | undefined
    /** The sender repository, as `owner/name`. */
    self: string
  }
}
