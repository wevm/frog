import fs from 'node:fs/promises'
import path from 'node:path'
import * as Cache from '../../Cache.js'
import * as Config from '../../Config.js'
import type * as Github from '../../Github.js'
import * as GithubModule from '../../Github.js'
import type * as Target from '../../Target.js'

/** Concurrent config lookups, bounded so a large dependency list does not open one socket each. */
const concurrency = 8

/**
 * Builds the resolver stack `Target.resolve` needs.
 *
 * The CLI resolves package names off disk and reads committed config through the REST API. The App
 * supplies its own pair.
 */
export function resolvers(options: resolvers.Options): Target.resolve.Options {
  const { outbound, client, root, self, store } = options

  return {
    outbound,
    readConfig: reader({ client, ...(store ? { store } : {}) }),
    readRepo: (name) => repoOf(name, root),
    self,
  }
}

export declare namespace resolvers {
  /** Options for {@link resolvers}. */
  type Options = {
    /** Outbound policy from config: whether to report at all, and where. */
    outbound: Config.Outbound
    /** Authenticated client, for reading a target repository's committed config. */
    client: Github.Client
    /** Repository root, holding `node_modules`. */
    root: string
    /** This repository, as `owner/name`. */
    self: string | undefined
    /** Where to keep config lookups. Absent reads fresh every time. */
    store?: Cache.Cache | undefined
  }
}

/**
 * Reads a repository's committed inbound policy, optionally through a cache. A repository that accepts
 * nothing is cached as such.
 *
 * Only pass a store when listing. Filing must read consent fresh, or a day-old yes would authorize an
 * issue on a project that has since opted out.
 */
export function reader(
  options: reader.Options,
): (repo: string) => Promise<Config.Inbound | undefined> {
  const { client, now = () => Date.now(), store } = options

  return async (repo) => {
    if (store) {
      const hit = await Cache.read<Config.Inbound | null>(store, repo, now())
      if (hit !== undefined) return hit ?? undefined
    }

    const inbound = await (async () => {
      const contents = await GithubModule.fetchFile(client, { path: Config.file, repo })
      if (!contents) return undefined
      try {
        return Config.from(JSON.parse(contents)).inbound
      } catch {
        return undefined
      }
    })()

    if (store) await Cache.write(store, repo, inbound ?? null, now())
    return inbound
  }
}

export declare namespace reader {
  /** Options for {@link reader}. */
  type Options = {
    /** Authenticated client. */
    client: Github.Client
    /** Current time, for cache expiry. */
    now?: (() => number) | undefined
    /** Where to keep lookups. Absent reads fresh every time. */
    store?: Cache.Cache | undefined
  }
}

/** A dependency that declares it accepts friction. */
export type Accepting = {
  /** Package name. */
  name: string
  /** Repository issues are filed on. */
  repo: string
}

/**
 * Dependencies that accept friction reports.
 *
 * Scans the declared dependencies rather than walking `node_modules`, which keeps the disk half of this a
 * handful of reads instead of thousands. Consent then costs one API call per distinct repository, cached
 * for a day.
 */
export async function accepting(options: accepting.Options): Promise<readonly Accepting[]> {
  const { client, root, self, store } = options

  const own = await fs
    .readFile(path.join(root, 'package.json'), 'utf8')
    .then((contents) => JSON.parse(contents) as Dependencies)
    .catch(() => undefined)

  const names = [
    ...new Set([
      ...Object.keys(own?.dependencies ?? {}),
      ...Object.keys(own?.devDependencies ?? {}),
      ...Object.keys(own?.optionalDependencies ?? {}),
      ...Object.keys(own?.peerDependencies ?? {}),
    ]),
  ].sort()

  const resolved = (
    await Promise.all(
      names.map(async (name) => {
        const repo = await repoOf(name, root)
        return repo ? { name, repo } : undefined
      }),
    )
  ).filter((entry): entry is Accepting => entry !== undefined)

  // Several packages of one monorepo share a repository, and asking about it once is enough.
  const repos = [...new Set(resolved.map((entry) => entry.repo))]
  const read = reader({ client, ...(store ? { store } : {}) })

  const accepts = new Set<string>()
  for (let index = 0; index < repos.length; index += concurrency) {
    const batch = repos.slice(index, index + concurrency)
    const inbounds = await Promise.all(batch.map((repo) => read(repo).catch(() => undefined)))
    batch.forEach((repo, offset) => {
      const inbound = inbounds[offset]
      if (inbound && Config.allows(inbound, self)) accepts.add(repo)
    })
  }

  return resolved.filter((entry) => accepts.has(entry.repo))
}

export declare namespace accepting {
  /** Options for {@link accepting}. */
  type Options = {
    /** Authenticated client, for reading each dependency's committed config. */
    client: Github.Client
    /** Repository root, holding `package.json` and `node_modules`. */
    root: string
    /** This repository, as `owner/name`, for applying each receiver's `allowFrom` policy. */
    self: string | undefined
    /** Where to keep config lookups. Absent reads fresh every time. */
    store?: Cache.Cache | undefined
  }
}

type Dependencies = {
  bugs?: { url?: string | undefined } | string | undefined
  dependencies?: Record<string, string> | undefined
  devDependencies?: Record<string, string> | undefined
  homepage?: string | undefined
  optionalDependencies?: Record<string, string> | undefined
  peerDependencies?: Record<string, string> | undefined
  repository?: { url?: string | undefined } | string | undefined
}

/**
 * Repository an installed package declares.
 *
 * `repository` is the field npm defines for this, and it resolves 98.5% of what is actually installed
 * here. `homepage` and `bugs` are tried after it for the handful that omit it.
 */
async function repoOf(name: string, root: string): Promise<string | undefined> {
  const contents = await fs
    .readFile(path.join(root, 'node_modules', name, 'package.json'), 'utf8')
    .catch(() => undefined)
  if (!contents) return undefined

  const declared = (() => {
    try {
      return JSON.parse(contents) as Dependencies
    } catch {
      return undefined
    }
  })()
  if (!declared) return undefined

  const { bugs, homepage, repository } = declared
  const candidates = [
    typeof repository === 'string' ? repository : repository?.url,
    homepage,
    typeof bugs === 'string' ? bugs : bugs?.url,
  ]

  for (const candidate of candidates) {
    const repo = GithubModule.parseRepository(candidate)
    if (repo) return repo
  }
  return undefined
}
