import * as Manifest from './Manifest.js'

/** How a target was named. */
export type Kind = 'host' | 'npm' | 'repo'

/**
 * Candidate interpretations of a target string, most likely first.
 *
 * One case is genuinely ambiguous: a bare dotted name is either a package (`lodash.merge`) or a host
 * (`viem.sh`). Rather than guess, both are tried in order, so an actually installed package wins and
 * anything else falls through to a host lookup. `npm:` forces the package reading.
 *
 * @param value - Target as written in frontmatter or passed to `--target`.
 * @returns The name to look up, and the kinds to try.
 */
export function classify(value: string): { kinds: readonly Kind[]; name: string } {
  if (value.startsWith('npm:')) return { kinds: ['npm'], name: value.slice(4) }
  if (value.includes('://')) return { kinds: ['host'], name: value }
  if (value.startsWith('@')) return { kinds: ['npm'], name: value }
  if (value.includes('/')) return { kinds: ['repo'], name: value }
  if (value.includes('.')) return { kinds: ['npm', 'host'], name: value }
  return { kinds: ['npm'], name: value }
}

/** Where an entry's issue belongs, once discovery and the gates have passed. */
export type Target = {
  /** How the target was discovered. */
  kind: Kind | 'self'
  /** Labels the receiver wants on inbound issues, when it named any. */
  labels?: readonly string[] | undefined
  /** Repository to file in, as `owner/name`. */
  repo: string
}

/** Why a target was refused, carrying a code the CLI surfaces directly. */
export type Refusal = {
  /** Machine-readable code. */
  code: string
  /** Human-readable explanation. */
  message: string
}

/** The outcome of resolving a target. */
export type Resolution =
  | {
      /** Discriminant: every gate passed. */
      ok: true
      /** Where the issue belongs. */
      target: Target
    }
  | (Refusal & {
      /** Discriminant: a gate refused the target. */
      ok: false
    })

/**
 * Resolves where an entry's issue belongs, applying every consent gate.
 *
 * Discovery is offline-first: an installed package's `package.json#frictionsets` needs no network at
 * all, and only a host falls back to fetching a well-known document.
 *
 * Three gates, all of which must pass for a target that is not this repository. The receiver must have
 * opted in, and may restrict who reports. A host's repository claim must be independently corroborated,
 * or a compromised site could aim every consumer at somebody else's issue tracker. And the sender must
 * have listed the target in `outbound.allowedRepos`, read from the base branch so a pull request cannot
 * name its own destination.
 *
 * Naming a repository directly is not a way around any of this: an explicit `owner/name` still requires
 * that repository to have committed a config accepting inbound friction.
 *
 * @returns The target, or a refusal naming which gate stopped it.
 */
export async function resolve(
  value: string | undefined,
  options: resolve.Options,
): Promise<Resolution> {
  const { allowedRepos, readConfig, readHost, readPackage, self } = options

  // No target means this repository, which needs nobody's consent.
  if (!value) {
    if (!self)
      return {
        code: 'NO_REPO',
        message:
          'Could not determine the target repository. Add a GitHub `origin` remote, or set `repo` in the config file.',
        ok: false,
      }
    return { ok: true, target: { kind: 'self', repo: self } }
  }

  const { kinds, name } = classify(value)

  // Naming this repository explicitly is the same as not naming one, and costs no lookup.
  if (kinds.includes('repo') && name === self)
    return { ok: true, target: { kind: 'self', repo: name } }

  const found = await discover(name, kinds, { readConfig, readHost, readPackage })
  if (!found.ok) return found

  const { kind, manifest } = found

  if (manifest.repo === self) return { ok: true, target: { kind: 'self', repo: manifest.repo } }

  if (!Manifest.allows(manifest.inbound, self))
    return {
      code: manifest.inbound.enabled ? 'SENDER_NOT_ALLOWED' : 'TARGET_NOT_ACCEPTING',
      message: manifest.inbound.enabled
        ? `\`${manifest.repo}\` does not accept friction from \`${self ?? 'an unknown repository'}\`.`
        : `\`${manifest.repo}\` does not accept friction reported by others.`,
      ok: false,
    }

  // Only a host names its own destination. A package cannot lie about it, because the manifest shipped
  // inside the tarball the consumer already installed.
  if (kind === 'host') {
    const inbound = await readConfig(manifest.repo)
    const packages = (
      await Promise.all(manifest.packages.map((entry) => readPackage(entry)))
    ).filter((entry): entry is Manifest.Manifest => entry !== undefined)

    if (!Manifest.corroborate(manifest, { accepts: inbound?.enabled === true, packages }))
      return {
        code: 'TARGET_NOT_CORROBORATED',
        message: `\`${value}\` claims to file issues on \`${manifest.repo}\`, and that repository does not confirm it.`,
        ok: false,
      }
  }

  if (!allowed(allowedRepos, manifest.repo))
    return {
      code: 'TARGET_NOT_ALLOWED',
      message: `\`${manifest.repo}\` is not listed in \`outbound.allowedRepos\`.`,
      ok: false,
    }

  return {
    ok: true,
    target: {
      kind,
      repo: manifest.repo,
      ...(manifest.inbound.labels ? { labels: manifest.inbound.labels } : {}),
    },
  }
}

export declare namespace resolve {
  /** Options for {@link resolve}. */
  type Options = {
    /** Targets this repository may file against, from the sender's base-branch config. */
    allowedRepos: readonly string[]
    /**
     * Reads a repository's committed inbound policy from its default branch.
     *
     * Injected because the CLI reads it over the REST API while the App reads it with an installation
     * token, and neither belongs in this module.
     */
    readConfig: (repo: string) => Promise<Manifest.Inbound | undefined>
    /** Fetches a host's well-known document. */
    readHost: (host: string) => Promise<Manifest.Lookup>
    /** Reads an installed package's manifest. */
    readPackage: (name: string) => Promise<Manifest.Manifest | undefined>
    /** This repository, as `owner/name`. The default target, and the sender for `allowFrom`. */
    self: string | undefined
  }
}

/** Tries each candidate kind in order, reporting every reason when none produce a manifest. */
async function discover(
  name: string,
  kinds: readonly Kind[],
  options: Pick<resolve.Options, 'readConfig' | 'readHost' | 'readPackage'>,
): Promise<(Refusal & { ok: false }) | { kind: Kind; manifest: Manifest.Manifest; ok: true }> {
  const reasons: string[] = []

  for (const kind of kinds) {
    if (kind === 'repo') {
      const inbound = await options.readConfig(name)
      if (inbound) return { kind, manifest: { inbound, packages: [], repo: name }, ok: true }
      reasons.push(`\`${name}\` has no committed frictionsets config`)
      continue
    }

    if (kind === 'npm') {
      const manifest = await options.readPackage(name)
      if (manifest) return { kind, manifest, ok: true }
      reasons.push(`\`${name}\` is not installed, or declares no \`frictionsets\` field`)
      continue
    }

    const lookup = await options.readHost(name)
    if (lookup.ok) return { kind, manifest: lookup.manifest, ok: true }
    reasons.push(lookup.reason)
  }

  return {
    code: 'TARGET_NOT_ACCEPTING',
    message: `Cannot report friction to \`${name}\`: ${reasons.join('; ')}.`,
    ok: false,
  }
}

/** Whether a target repository is on the sender's allowlist. Supports `owner/*`. */
function allowed(allowedRepos: readonly string[], repo: string): boolean {
  return allowedRepos.some((pattern) => {
    if (pattern === repo) return true
    const [owner, name] = pattern.split('/')
    return name === '*' && repo.startsWith(`${owner}/`)
  })
}
