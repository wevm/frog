import * as Config from './Config.js'

/** How a target was named. */
export type Kind = 'npm' | 'repo'

const repoPattern = /^[\w.-]+\/[\w.-]+$/

/**
 * How a target string names a repository.
 *
 * Only two forms exist, because an issue can only be filed on a GitHub repository: name that repository,
 * or name a package that declares it.
 *
 * @param value - Target as written in frontmatter or passed to `--target`.
 * @returns The name to look up, and how to look it up.
 */
export function classify(value: string): { kind: Kind; name: string } {
  if (value.startsWith('@')) return { kind: 'npm', name: value }
  if (value.includes('/')) return { kind: 'repo', name: value }
  return { kind: 'npm', name: value }
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
 * Naming and consent are separate steps. A target string only ever names a repository, whether directly or
 * through a package's `repository` field, and consent is then read from that repository's own default
 * branch. Nothing a package or a third party says can redirect a report to a repository that has not
 * itself opted in.
 *
 * Two gates guard a target that is not this repository. The receiver must have committed a config
 * accepting inbound friction, and may restrict who reports. And the sender must have listed the target in
 * `outbound.allowedRepos`, read from the base branch so a pull request cannot name its own destination.
 *
 * @returns The target, or a refusal naming which gate stopped it.
 */
export async function resolve(
  value: string | undefined,
  options: resolve.Options,
): Promise<Resolution> {
  const { allowedRepos, readConfig, self } = options

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

  const found = await locate(value, options)
  if (!found.ok) return found
  const { kind, repo } = found

  if (repo === self) return { ok: true, target: { kind: 'self', repo } }

  const inbound = await readConfig(repo)
  if (!inbound)
    return {
      code: 'TARGET_NOT_ACCEPTING',
      message: `\`${repo}\` has not opted in: it commits no \`${Config.file}\`.`,
      ok: false,
    }

  if (!Config.allows(inbound, self))
    return {
      code: inbound.enabled ? 'SENDER_NOT_ALLOWED' : 'TARGET_NOT_ACCEPTING',
      message: inbound.enabled
        ? `\`${repo}\` does not accept friction from \`${self ?? 'an unknown repository'}\`.`
        : `\`${repo}\` does not accept friction reported by others.`,
      ok: false,
    }

  if (!allowed(allowedRepos, repo))
    return {
      code: 'TARGET_NOT_ALLOWED',
      message: `\`${repo}\` is not listed in \`outbound.allowedRepos\`.`,
      ok: false,
    }

  return {
    ok: true,
    target: { kind, repo, ...(inbound.labels ? { labels: inbound.labels } : {}) },
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
    readConfig: (repo: string) => Promise<Config.Inbound | undefined>
    /**
     * Resolves a package name to the repository it declares.
     *
     * Injected for the same reason: the CLI reads `node_modules`, and the App asks the npm registry.
     */
    readRepo: (name: string) => Promise<string | undefined>
    /** This repository, as `owner/name`. The default target, and the sender for `allowFrom`. */
    self: string | undefined
  }
}

/** Maps a target string to the repository it names, without asking whether that repository consents. */
async function locate(
  value: string,
  options: Pick<resolve.Options, 'readRepo'>,
): Promise<(Refusal & { ok: false }) | { kind: Kind; ok: true; repo: string }> {
  if (value.includes('://'))
    return {
      code: 'TARGET_UNKNOWN',
      message: `\`${value}\` is a URL. Name the repository behind it instead, as \`owner/name\`.`,
      ok: false,
    }

  const { kind, name } = classify(value)
  if (kind === 'repo') {
    if (repoPattern.test(name)) return { kind, ok: true, repo: name }
    return {
      code: 'TARGET_UNKNOWN',
      message: `\`${name}\` is not a repository. Name it as \`owner/name\`.`,
      ok: false,
    }
  }

  const repo = await options.readRepo(name)
  if (repo) return { kind, ok: true, repo }

  return {
    code: 'TARGET_UNKNOWN',
    message: `\`${name}\` is not installed, or declares no GitHub repository. Name the repository instead, as \`owner/name\`.`,
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
