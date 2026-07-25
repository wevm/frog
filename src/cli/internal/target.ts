import fs from 'node:fs/promises'
import path from 'node:path'
import * as Config from '../../Config.js'
import type * as Github from '../../Github.js'
import * as GithubModule from '../../Github.js'
import * as Manifest from '../../Manifest.js'
import * as cache from './cache.js'
import type * as Target from '../../Target.js'

/**
 * Builds the resolver stack `Target.resolve` needs.
 *
 * The CLI reads packages off disk, hosts over HTTP, and repository config through the REST API. The
 * App will supply its own three, which is why `Target` takes them rather than importing any of it.
 */
export function resolvers(options: resolvers.Options): Target.resolve.Options {
  const { allowedRepos, cache: cached = true, client, root, self } = options

  return {
    allowedRepos,
    async readConfig(repo) {
      const contents = await GithubModule.fetchFile(client, { path: Config.file, repo }).catch(
        () => undefined,
      )
      if (!contents) return undefined
      try {
        return Config.from(JSON.parse(contents)).inbound
      } catch {
        return undefined
      }
    },
    readHost: (host) => Manifest.fetchDocument(host, ...(cached ? [{ cache: cache.file() }] : [])),
    readPackage: (name) => Manifest.fromPackage(name, { root }),
    self,
  }
}

export declare namespace resolvers {
  /** Options for {@link resolvers}. */
  type Options = {
    /** Targets this repository may file against, from config. */
    allowedRepos: readonly string[]
    /** Read cached well-known documents. */
    cache?: boolean | undefined
    /** Authenticated client, for reading a target repository's committed config. */
    client: Github.Client
    /** Repository root, holding `node_modules`. */
    root: string
    /** This repository, as `owner/name`. */
    self: string | undefined
  }
}

/** A dependency that declares it accepts friction. */
export type Accepting = {
  /** How it was discovered. */
  kind: 'npm' | 'well-known'
  /** Package name, or host. */
  name: string
  /** Repository issues are filed on. */
  repo: string
}

/**
 * Dependencies that accept friction reports.
 *
 * Scans the declared dependencies rather than walking `node_modules`, which keeps this a handful of
 * file reads instead of thousands. This is what the generated skill lists, so an agent never has to
 * recall which upstreams take reports.
 */
export async function accepting(options: accepting.Options): Promise<readonly Accepting[]> {
  const { probe = false, root } = options

  const own = await fs
    .readFile(path.join(root, 'package.json'), 'utf8')
    .then((contents) => JSON.parse(contents) as Dependencies)
    .catch(() => undefined)

  const names = [
    ...new Set([
      ...Object.keys(own?.dependencies ?? {}),
      ...Object.keys(own?.devDependencies ?? {}),
      ...Object.keys(own?.peerDependencies ?? {}),
    ]),
  ].sort()

  const found: Accepting[] = []
  for (const name of names) {
    const manifest = await Manifest.fromPackage(name, { root })
    if (manifest?.inbound.enabled) {
      found.push({ kind: 'npm', name, repo: manifest.repo })
      continue
    }
    if (!probe) continue

    // Only reached with --probe: a package with no manifest may still be fronted by a site that has
    // one, which is how a docs site or an API becomes reportable.
    const homepage = await homepageOf(name, root)
    if (!homepage) continue
    const lookup = await Manifest.fetchDocument(homepage, { cache: cache.file() })
    if (lookup.ok && lookup.manifest.inbound.enabled)
      found.push({ kind: 'well-known', name: homepage, repo: lookup.manifest.repo })
  }
  return found
}

export declare namespace accepting {
  /** Options for {@link accepting}. */
  type Options = {
    /** Also fetch well-known documents from each dependency's homepage. Costs network. */
    probe?: boolean | undefined
    /** Repository root, holding `package.json` and `node_modules`. */
    root: string
  }
}

type Dependencies = {
  dependencies?: Record<string, string> | undefined
  devDependencies?: Record<string, string> | undefined
  homepage?: string | undefined
  peerDependencies?: Record<string, string> | undefined
}

/** Homepage host declared by an installed package. */
async function homepageOf(name: string, root: string): Promise<string | undefined> {
  const contents = await fs
    .readFile(path.join(root, 'node_modules', name, 'package.json'), 'utf8')
    .catch(() => undefined)
  if (!contents) return undefined

  const homepage = (() => {
    try {
      return (JSON.parse(contents) as Dependencies).homepage
    } catch {
      return undefined
    }
  })()
  if (!homepage) return undefined

  try {
    return new URL(homepage).origin
  } catch {
    return undefined
  }
}
