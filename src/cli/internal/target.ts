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
  let declared: Promise<ReadonlySet<string>> | undefined
  let indexed: Promise<Inventory> | undefined
  const direct = () => (declared ??= rootDependencies(root))
  const inventory = () => (indexed ??= installed(root))

  return {
    outbound,
    readConfig: reader({ client, ...(store ? { store } : {}) }),
    async readRepo(name) {
      if ((await direct()).has(name)) {
        const declared = await installedPackage(name, root)
        if (!declared) return undefined
        if (declared.name === name) return declared.repo
      }

      const indexed = await inventory()
      const canonical = indexed.canonical.repositories.get(name)
      if (canonical || indexed.canonical.names.has(name)) return canonical

      const alias = indexed.aliases.repositories.get(name)
      if (alias || indexed.aliases.names.has(name)) return alias

      // Preserve support for manually installed root packages that the project does not declare.
      return (await installedPackage(name, root))?.repo
    },
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
 * Walks the installed dependency graph so nested packages and pnpm's virtual store are both covered.
 * Consent costs one API call per distinct repository, cached for a day.
 */
export async function accepting(options: accepting.Options): Promise<readonly Accepting[]> {
  const { client, root, self, store } = options

  const resolved = (await installed(root)).targets

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
  name?: string | undefined
  optionalDependencies?: Record<string, string> | undefined
  peerDependencies?: Record<string, string> | undefined
  repository?: { url?: string | undefined } | string | undefined
}

type Candidate = {
  direct: boolean
  directRepos: Set<string>
  exactDirect: boolean
  exactDirectRepo?: string | undefined
  repos: Set<string>
}

type Index = {
  names: ReadonlySet<string>
  repositories: ReadonlyMap<string, string>
}

type Inventory = {
  aliases: Index
  canonical: Index
  targets: readonly Accepting[]
}

type Pending = {
  direct: boolean
  from: string
  name: string
}

/** Every installed package name that resolves to one unambiguous GitHub repository. */
async function installed(root: string): Promise<Inventory> {
  const own = await readPackage(path.join(root, 'package.json'))
  if (!own)
    return {
      aliases: { names: new Set(), repositories: new Map() },
      canonical: { names: new Set(), repositories: new Map() },
      targets: [],
    }

  const pending: Pending[] = dependencies(own, true).map((name) => ({
    direct: true,
    from: root,
    name,
  }))
  const aliases = new Map<string, Candidate>()
  const canonical = new Map<string, Candidate>()
  const listed = new Set<string>()
  const seen = new Set<string>()

  for (let index = 0; index < pending.length; index++) {
    const next = pending[index]!
    const file = await resolvePackage(next.name, next.from)
    if (!file) continue

    const declared = await readPackage(file)
    const repo = declared ? repositoryOf(declared) : undefined
    const canonicalName = declared?.name && packageParts(declared.name) ? declared.name : next.name
    listed.add(canonicalName)

    addCandidate(canonical, canonicalName, {
      direct: next.direct,
      exactDirect: next.direct && canonicalName === next.name,
      repo,
    })
    if (canonicalName !== next.name)
      addCandidate(aliases, next.name, {
        direct: next.direct,
        exactDirect: next.direct,
        repo,
      })

    if (!declared || seen.has(file)) continue
    seen.add(file)
    for (const name of dependencies(declared, false))
      pending.push({ direct: false, from: path.dirname(file), name })
  }

  const canonicalRepositories = repositories(canonical)

  return {
    aliases: { names: new Set(aliases.keys()), repositories: repositories(aliases) },
    canonical: { names: new Set(canonical.keys()), repositories: canonicalRepositories },
    targets: [...listed].sort().flatMap((name) => {
      const repo = canonicalRepositories.get(name)
      return repo ? [{ name, repo }] : []
    }),
  }
}

function addCandidate(
  candidates: Map<string, Candidate>,
  name: string,
  options: { direct: boolean; exactDirect: boolean; repo: string | undefined },
): void {
  const { direct, exactDirect, repo } = options
  const candidate = candidates.get(name) ?? {
    direct: false,
    directRepos: new Set<string>(),
    exactDirect: false,
    repos: new Set<string>(),
  }
  candidate.direct ||= direct
  if (direct && repo) candidate.directRepos.add(repo)
  if (exactDirect) {
    candidate.exactDirect = true
    candidate.exactDirectRepo = repo
  }
  if (repo) candidate.repos.add(repo)
  candidates.set(name, candidate)
}

function repositories(candidates: ReadonlyMap<string, Candidate>): ReadonlyMap<string, string> {
  const resolved = new Map<string, string>()
  for (const [name, candidate] of [...candidates].sort(([a], [b]) => a.localeCompare(b))) {
    const repo = candidate.exactDirect
      ? candidate.exactDirectRepo
      : candidate.direct
        ? candidate.directRepos.size === 1
          ? candidate.directRepos.values().next().value
          : undefined
        : candidate.repos.size === 1
          ? candidate.repos.values().next().value
          : undefined
    if (repo) resolved.set(name, repo)
  }
  return resolved
}

async function rootDependencies(root: string): Promise<ReadonlySet<string>> {
  const own = await readPackage(path.join(root, 'package.json'))
  return new Set(own ? dependencies(own, true) : [])
}

/** Dependency names installed for a project or package. */
function dependencies(declared: Dependencies, root: boolean): string[] {
  return [
    ...new Set([
      ...Object.keys(declared.dependencies ?? {}),
      ...(root ? Object.keys(declared.devDependencies ?? {}) : []),
      ...Object.keys(declared.optionalDependencies ?? {}),
      ...Object.keys(declared.peerDependencies ?? {}),
    ]),
  ].sort()
}

/** Resolves a dependency using Node's ancestor `node_modules` lookup from a real package path. */
async function resolvePackage(name: string, from: string): Promise<string | undefined> {
  const parts = packageParts(name)
  if (!parts) return undefined

  let directory = from
  while (true) {
    const candidate = path.join(directory, 'node_modules', ...parts, 'package.json')
    const file = await fs.realpath(candidate).catch(() => undefined)
    if (file) return file

    const parent = path.dirname(directory)
    if (parent === directory) return undefined
    directory = parent
  }
}

/** Reads an installed package's canonical name and repository. */
async function installedPackage(
  name: string,
  root: string,
): Promise<{ name: string; repo?: string | undefined } | undefined> {
  const file = await resolvePackage(name, root)
  if (!file) return undefined
  const declared = await readPackage(file)
  if (!declared) return undefined

  const canonical = declared.name && packageParts(declared.name) ? declared.name : name
  const repo = repositoryOf(declared)
  return { name: canonical, ...(repo ? { repo } : {}) }
}

/** Splits an npm package name without allowing it to escape `node_modules`. */
function packageParts(name: string): string[] | undefined {
  if (!name || name.includes('\\')) return undefined
  const parts = name.split('/')
  if (parts.some((part) => !part || part === '.' || part === '..')) return undefined
  if (name.startsWith('@')) return parts.length === 2 ? parts : undefined
  return parts.length === 1 ? parts : undefined
}

async function readPackage(file: string): Promise<Dependencies | undefined> {
  const contents = await fs.readFile(file, 'utf8').catch(() => undefined)
  return contents === undefined ? undefined : parsePackage(contents)
}

function parsePackage(contents: string): Dependencies | undefined {
  try {
    const value = JSON.parse(contents) as unknown
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Dependencies)
      : undefined
  } catch {
    return undefined
  }
}

/**
 * Repository a package declares.
 *
 * `repository` is npm's standard field. `homepage` and `bugs` cover packages that omit it.
 */
function repositoryOf(declared: Dependencies): string | undefined {
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
