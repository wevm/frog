import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { z } from 'incur'

/** Path a project serves its manifest from. */
export const wellKnown = '.well-known/frictionsets.json'

/** Only version this release understands. A document declaring anything else is rejected, not guessed at. */
export const version = 1

const repoPattern = /^[\w.-]+\/[\w.-]+$/

const Inbound = z.object({
  allowFrom: z
    .array(z.string().min(1))
    .optional()
    .describe(
      'Sender repositories, or `owner/*` globs, allowed to report here. Absent means anyone.',
    ),
  enabled: z.boolean().default(true).describe('Whether friction reports are accepted at all.'),
  labels: z.array(z.string().min(1)).optional().describe('Labels applied to inbound issues.'),
})

/**
 * The document as published, at `/.well-known/frictionsets.json` or in `package.json#frictionsets`.
 *
 * `inbound` accepts `true` as shorthand for the common case, so a project opting in writes one word.
 */
export const Schema = z.object({
  docs: z.url().optional().describe('Page explaining what this project wants reported.'),
  inbound: z
    .union([z.boolean(), Inbound])
    .optional()
    .describe('Whether and how this project accepts friction reported by others.'),
  labels: z.array(z.string().min(1)).optional().describe('Labels applied to inbound issues.'),
  name: z.string().min(1).optional().describe('Human-readable project name.'),
  packages: z
    .array(z.string().min(1))
    .optional()
    .describe(
      'npm package names this document speaks for. Used to corroborate the repository claim.',
    ),
  repo: z.string().regex(repoPattern).describe('Repository issues are filed on, as `owner/name`.'),
  version: z
    .literal(version)
    .optional()
    .describe('Document format version. Absent is treated as 1.'),
})

/**
 * The document as written, before normalization.
 *
 * Field documentation lives on {@link Schema} as `.describe()`, for the same reason as `Config`: that
 * is what reaches `manifest.schema.json`, where it becomes autocomplete for whoever writes the JSON.
 */
export type Written = z.input<typeof Schema>

/** How a project accepts inbound friction. */
export type Inbound = {
  /** Sender repositories, or `owner/*` globs, allowed to report here. Absent means anyone. */
  allowFrom?: readonly string[] | undefined
  /** Whether friction reports are accepted at all. */
  enabled: boolean
  /** Labels applied to inbound issues. */
  labels?: readonly string[] | undefined
}

/** A project's declaration that it accepts friction, normalized. */
export type Manifest = {
  /** Page explaining what this project wants reported. */
  docs?: string | undefined
  /** Whether and how friction reports are accepted. */
  inbound: Inbound
  /** Human-readable project name. */
  name?: string | undefined
  /** npm package names this document speaks for. */
  packages: readonly string[]
  /** Repository issues are filed on, as `owner/name`. */
  repo: string
}

/**
 * Normalizes an already-loaded manifest.
 *
 * @returns The manifest, or `undefined` when the value is not a usable one. Being unusable is an
 * ordinary answer here, not an error: most packages have no manifest at all.
 */
export function from(value: unknown): Manifest | undefined {
  const result = Schema.safeParse(value)
  if (!result.success) return undefined

  const { docs, inbound, labels, name, packages, repo } = result.data
  const normalized: Inbound =
    typeof inbound === 'boolean' ? { enabled: inbound } : (inbound ?? { enabled: true })
  // Top-level `labels` is the shorthand; the nested form wins when both are present.
  const applied = normalized.labels ?? labels

  return {
    inbound: {
      enabled: normalized.enabled,
      ...(normalized.allowFrom ? { allowFrom: normalized.allowFrom } : {}),
      ...(applied ? { labels: applied } : {}),
    },
    packages: packages ?? (name ? [name] : []),
    repo,
    ...(docs ? { docs } : {}),
    ...(name ? { name } : {}),
  }
}

/** A rendered document: what {@link render} produces and a project serves. */
export type Document = Written & {
  /** Always `true`. Rendering a document is how a project opts in. */
  inbound: true
  /** Always the version this release writes. */
  version: typeof version
}

/**
 * Renders the document a project serves.
 *
 * @returns The document, ready to write to `/.well-known/frictionsets.json`.
 */
export function render(options: render.Options): Document {
  const { docs, labels, name, packages, repo } = options
  return {
    version,
    repo,
    inbound: true,
    ...(name ? { name } : {}),
    ...(packages?.length ? { packages: [...packages] } : {}),
    ...(labels?.length ? { labels: [...labels] } : {}),
    ...(docs ? { docs } : {}),
  }
}

export declare namespace render {
  /** Options for {@link render}. */
  type Options = {
    /** Page explaining what this project wants reported. */
    docs?: string | undefined
    /** Labels to apply to inbound issues. */
    labels?: readonly string[] | undefined
    /** Human-readable project name. */
    name?: string | undefined
    /** npm package names this document speaks for. */
    packages?: readonly string[] | undefined
    /** Repository issues are filed on, as `owner/name`. */
    repo: string
  }
}

/**
 * Reads an installed package's manifest.
 *
 * This is the offline path, and the reason `package.json#frictionsets` was chosen over a separate
 * file: that field ships in every tarball with no `files` configuration, so consent is a filesystem
 * read with no API call, no rate limit, and no network in CI.
 *
 * @param name - npm package name.
 * @returns The manifest, or `undefined` when the package is absent or declares none.
 */
export async function fromPackage(
  name: string,
  options: fromPackage.Options,
): Promise<Manifest | undefined> {
  const file = path.join(options.root, 'node_modules', name, 'package.json')
  const contents = await fs.readFile(file, 'utf8').catch(() => undefined)
  if (!contents) return undefined

  const parsed = (() => {
    try {
      return JSON.parse(contents) as { frictionsets?: unknown }
    } catch {
      return undefined
    }
  })()
  if (!parsed?.frictionsets) return undefined

  const manifest = from(parsed.frictionsets)
  return manifest ? named(manifest, name) : undefined
}

/**
 * Fills in what a lookup by package name already implies.
 *
 * Looked up by name, so the name is known even when the field omits it. Corroboration compares against
 * both of these, so neither may be left blank. Shared by every reader — the filesystem one and the
 * registry one the App uses — because a difference here would silently weaken the check.
 *
 * @param name - Package name the manifest was found under.
 */
export function named(manifest: Manifest, name: string): Manifest {
  return {
    ...manifest,
    name: manifest.name ?? name,
    packages: manifest.packages.length ? manifest.packages : [name],
  }
}

export declare namespace fromPackage {
  /** Options for {@link fromPackage}. */
  type Options = {
    /** Directory holding `node_modules`. */
    root: string
  }
}

/** The result of looking a manifest up over the network. */
export type Lookup =
  | {
      /** The manifest the host serves. */
      manifest: Manifest
      /** Discriminant: a manifest was found. */
      ok: true
    }
  | {
      /** Discriminant: no usable manifest. */
      ok: false
      /** Why no manifest was usable, for reporting rather than throwing. */
      reason: string
    }

/** Default cache location, honoring `XDG_CACHE_HOME`. */
export function cacheDir(env: Record<string, string | undefined> = process.env): string {
  const base = env['XDG_CACHE_HOME'] || path.join(os.homedir(), '.cache')
  return path.join(base, 'frictionsets')
}

/** How long a fetched document is trusted before being fetched again. */
export const cacheTtl = 24 * 60 * 60 * 1000

/**
 * Fetches a host's manifest, caching the result.
 *
 * Covers everything the npm path cannot: docs sites, HTTP APIs, services, and other ecosystems, where
 * there is no installed package to inspect. Timed out aggressively, because this can sit in the path
 * of an agent logging friction and must never hang that.
 *
 * @param host - Hostname or URL, such as `viem.sh` or `https://viem.sh`.
 */
export async function fetchDocument(
  host: string,
  options: fetchDocument.Options = {},
): Promise<Lookup> {
  const { cache = true, dir = cacheDir(), now = Date.now(), timeout = 5_000 } = options

  const origin = host.includes('://') ? host : `https://${host}`
  const url = (() => {
    try {
      return new URL(wellKnown, `${new URL(origin).origin}/`).toString()
    } catch {
      return undefined
    }
  })()
  if (!url) return { ok: false, reason: `\`${host}\` is not a valid host.` }

  const file = path.join(dir, `${encodeURIComponent(new URL(url).host)}.json`)

  if (cache) {
    const cached = await read(file, now)
    if (cached) return cached
  }

  const response = await globalThis
    .fetch(url, { signal: AbortSignal.timeout(timeout) })
    .catch((error: Error) => error)

  // Not cached: being unreachable is usually transient, and caching it would keep a project invisible
  // for a day after a blip. Everything below is the server answering definitively.
  if (response instanceof Error)
    return { ok: false, reason: `Could not reach ${url}: ${response.message}.` }

  const lookup = await (async (): Promise<Lookup> => {
    if (!response.ok) return { ok: false, reason: `${url} returned ${response.status}.` }
    const manifest = from(await response.json().catch(() => undefined))
    return manifest
      ? { manifest, ok: true }
      : { ok: false, reason: `${url} is not a valid frictionsets manifest.` }
  })()

  // A definitive absence is cached as well as a hit: most hosts have no manifest, and re-probing every
  // one of them on every call would put the network in the path of logging friction.
  await write(file, lookup, now)
  return lookup
}

export declare namespace fetchDocument {
  /** Options for {@link fetchDocument}. */
  type Options = {
    /** Read from the cache. Writing to it happens either way. */
    cache?: boolean | undefined
    /** Cache directory. Defaults to {@link cacheDir}. */
    dir?: string | undefined
    /** Current time, for cache expiry. */
    now?: number | undefined
    /** Milliseconds before giving up. */
    timeout?: number | undefined
  }
}

/** Reads a cached lookup, ignoring one that has expired. */
async function read(file: string, now: number): Promise<Lookup | undefined> {
  const contents = await fs.readFile(file, 'utf8').catch(() => undefined)
  if (!contents) return undefined

  const entry = (() => {
    try {
      return JSON.parse(contents) as { at?: number; lookup?: Lookup }
    } catch {
      return undefined
    }
  })()
  if (!entry?.at || !entry.lookup || now - entry.at > cacheTtl) return undefined
  return entry.lookup
}

/** Caches a lookup, including a failure, so an absent manifest is not re-probed on every call. */
async function write(file: string, lookup: Lookup, at: number): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true }).catch(() => undefined)
  await fs.writeFile(file, JSON.stringify({ at, lookup }), 'utf8').catch(() => undefined)
}

/**
 * Whether a host's repository claim is independently confirmed.
 *
 * A manifest is fetched from a third-party host and its `repo` decides where issues are filed. A
 * compromised or malicious site could name somebody else's repository and turn every consumer into a
 * spam source, so the claim is never trusted alone. Confirmation is either the repository committing a
 * config that accepts inbound friction, or a package the document speaks for pointing back at the same
 * repository.
 *
 * Pure: the caller gathers the evidence, so this stays testable and identical for the CLI and the App.
 *
 * @returns Whether the claim holds.
 */
export function corroborate(manifest: Manifest, evidence: corroborate.Evidence): boolean {
  if (evidence.accepts) return true

  // A package only corroborates if the claim is mutual: the document names the package, and the
  // package points back at the same repository.
  return (evidence.packages ?? []).some(
    (candidate) =>
      candidate.repo === manifest.repo && manifest.packages.includes(candidate.name ?? ''),
  )
}

export declare namespace corroborate {
  /** Evidence for {@link corroborate}. */
  type Evidence = {
    /**
     * Whether the claimed repository's own committed config accepts inbound friction.
     *
     * Read from that repository's default branch, so reading it at all establishes provenance; this
     * only records whether it opted in. Normalizing it belongs to `Config`, not here.
     */
    accepts?: boolean | undefined
    /** Manifests of the packages the document names, resolved locally. */
    packages?: readonly Manifest[] | undefined
  }
}

/** Whether `sender` is allowed to report to a project. */
export function allows(inbound: Inbound, sender: string | undefined): boolean {
  if (!inbound.enabled) return false
  if (!inbound.allowFrom?.length) return true
  if (!sender) return false

  return inbound.allowFrom.some((pattern) => {
    if (pattern === sender) return true
    const [owner, name] = pattern.split('/')
    return name === '*' && sender.startsWith(`${owner}/`)
  })
}
