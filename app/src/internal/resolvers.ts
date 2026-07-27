import { Config, Github, type Target } from 'frog'
import type { Octokit } from 'octokit'

/** Where the npm registry serves package metadata. */
export const registry = 'https://registry.npmjs.org'

/**
 * Repository a package declares, from the npm registry.
 *
 * The App has no `node_modules` to inspect, so the offline path the CLI uses does not exist here. The
 * registry serves the same `repository` field, which is where a package names the repository its issues
 * belong on.
 *
 * Resolved at `latest` rather than the version a consumer has pinned. Which repository a package belongs
 * to is not something that varies by patch release, and resolving a range here would mean reading the
 * consumer's lockfile.
 *
 * @param name - npm package name.
 * @returns The repository as `owner/name`, or `undefined` when the package declares none on GitHub.
 */
export async function fromRegistry(
  name: string,
  options: { timeout?: number | undefined; url?: string | undefined } = {},
): Promise<string | undefined> {
  const { timeout = 5_000, url = registry } = options

  // Only the slash is escaped: the registry expects `@scope%2Fname`, not a fully encoded path.
  const response = await globalThis.fetch(`${url}/${name.replace('/', '%2F')}/latest`, {
    signal: AbortSignal.timeout(timeout),
  })
  if (response.status === 404) return undefined
  if (!response.ok) throw new Error(`npm registry returned ${response.status} for \`${name}\`.`)

  const document = (await response.json()) as {
    bugs?: { url?: string } | string
    homepage?: string
    repository?: { url?: string } | string
  }

  const { bugs, homepage, repository } = document
  const candidates = [
    typeof repository === 'string' ? repository : repository?.url,
    homepage,
    typeof bugs === 'string' ? bugs : bugs?.url,
  ]

  for (const candidate of candidates) {
    const repo = Github.parseRepository(candidate)
    if (repo) return repo
  }
  return undefined
}

/**
 * Builds the resolver stack `Target.resolve` needs, backed by the API and the registry.
 *
 * The same two lookups the CLI supplies from disk, over the network instead. Every consent gate is
 * unchanged, which is the point of `Target` taking them as arguments.
 */
export function resolvers(options: resolvers.Options): Target.resolve.Options {
  const { outbound, installation, registry: url, self } = options

  return {
    outbound,
    async readConfig(repo) {
      const client = await installation(repo)
      if (!client) throw new InstallationMissingError(repo)

      const contents = await Github.fetchFile(client.rest, { path: Config.file, repo })
      if (!contents) return undefined
      try {
        return Config.from(JSON.parse(contents)).inbound
      } catch {
        return undefined
      }
    },
    readRepo: (name) => fromRegistry(name, ...(url ? [{ url }] : [])),
    self,
  }
}

export declare namespace resolvers {
  /** Options for {@link resolvers}. */
  type Options = {
    /** Sender's outbound policy, from its base-branch config. */
    outbound: Config.Outbound
    /** Resolves the installation client authorized to read each target repository. */
    installation: (repo: string) => Promise<Octokit | undefined>
    /** Registry base URL. Overridden in tests. */
    registry?: string | undefined
    /** The sender repository, as `owner/name`. */
    self: string
  }
}

/** Signals that target consent could not be read because the App is not installed there. */
export class InstallationMissingError extends Error {
  /** Repository whose installation is missing. */
  repo: string

  constructor(repo: string) {
    super(`frog is not installed on \`${repo}\`.`)
    this.name = 'InstallationMissingError'
    this.repo = repo
  }
}
