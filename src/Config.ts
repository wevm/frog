import fs from 'node:fs/promises'
import path from 'node:path'
import { z } from 'incur'
import { dir } from './Store.js'

/** Path of the config file, relative to the repository root. */
export const file = `${dir}/config.json`

const repoPattern = /^[\w.-]+\/[\w.-]+$/
const repoAllowPattern = /^[\w.-]+\/(?:[\w.-]+|\*)$/

/**
 * One schema serves both shapes: `z.input` is what a user writes (everything optional), `z.output`
 * is what the code consumes (every default applied).
 *
 * Field docs live in `.describe()` rather than TSDoc so they reach `schema.json`, where `$schema`
 * turns them into editor autocomplete for whoever is actually writing the config.
 */
export const Schema = z.object({
  commit: z.boolean().default(true).describe('Commit the file changes that publish and sync make.'),
  inbound: z
    .object({
      allowFrom: z
        .array(z.string().regex(repoAllowPattern))
        .optional()
        .describe(
          'Sender repositories, or `owner/*` globs, allowed to report friction here. Absent means anyone.',
        ),
      enabled: z
        .boolean()
        .default(false)
        .describe('Accept friction reported by other repositories.'),
      labels: z
        .array(z.string().min(1))
        .optional()
        .describe('Labels applied to inbound issues, in place of `labels`.'),
    })
    .prefault({})
    .describe('Whether and how this repository accepts friction reported by others.'),
  labels: z
    .array(z.string().min(1))
    .default(['friction'])
    .describe('Labels applied to every issue this repository files about itself.'),
  maxPerRun: z
    .number()
    .int()
    .positive()
    .default(10)
    .describe('Ceiling on issues filed in a single publish run, so a runaway agent cannot spray.'),
  outbound: z
    .object({
      allowedRepos: z
        .array(z.string().regex(repoAllowPattern))
        .default([])
        .describe(
          'Targets this repository may file against. Always read from the base branch, never a pull request head.',
        ),
      auto: z
        .boolean()
        .default(false)
        .describe(
          'Let the GitHub App file cross-repo without a human running publish. Off, because a private repository can leak proprietary detail upstream.',
        ),
    })
    .prefault({})
    .describe('Where friction may be reported, and whether automation may do it unattended.'),
  publishOnLog: z
    .boolean()
    .default(false)
    .describe('Make `log` file the issue immediately, without needing `--publish`.'),
  repo: z
    .string()
    .regex(repoPattern)
    .optional()
    .describe(
      "`owner/name` this repository's own friction is filed against. Defaults to the origin remote.",
    ),
  severityLabels: z
    .object({
      blocker: z.string().min(1).default('friction:blocker'),
      major: z.string().min(1).default('friction:major'),
      minor: z.string().min(1).default('friction:minor'),
    })
    .prefault({})
    .describe('Issue label applied for each severity.'),
  sync: z
    .object({
      closeOnDelete: z
        .boolean()
        .default(false)
        .describe(
          'Close the issue when its file is deleted by hand. Off, because a deletion is often just a rebase.',
        ),
    })
    .prefault({})
    .describe('How local files reconcile against issue state.'),
})

/**
 * Normalized config, with every default applied.
 *
 * Field documentation lives on {@link Schema} as `.describe()` rather than as TSDoc here. That is
 * deliberate and the one exception in this package: `.describe()` is what reaches `schema.json`, where
 * `$schema` turns it into autocomplete for the person writing the JSON. Duplicating the same prose as
 * TSDoc would give two sources that drift. Run `frog publish --schema` to read it.
 */
export type Config = z.output<typeof Schema>

/** Config as written on disk: every field optional, before defaults are applied. */
export type WrittenConfig = z.input<typeof Schema>

/**
 * How a project accepts inbound friction.
 *
 * Derived from {@link Schema} rather than declared again, so the committed config and the shape consent is
 * checked against cannot drift.
 */
export type Inbound = Config['inbound']

/**
 * Whether `sender` is allowed to report friction to a project.
 *
 * @param inbound - The target's declared inbound policy.
 * @param sender - Repository doing the reporting, as `owner/name`.
 * @returns Whether the report is allowed. An `allowFrom` entry may be an `owner/*` glob.
 */
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

/**
 * Normalizes already-loaded config.
 *
 * The one chokepoint between written and normalized config, so anything reading config over the
 * network (the App, a consent check on a target) gets identical defaults to the CLI reading it off disk.
 */
export function from(value: unknown, options: from.Options = {}): Config {
  const written = value ?? {}
  if (typeof written !== 'object' || Array.isArray(written)) throw new InvalidError({ issues: [] })
  const result = Schema.safeParse({ ...options.defaults, ...written })
  if (!result.success) throw new InvalidError({ issues: result.error.issues })
  return result.data
}

export declare namespace from {
  /** Options for {@link from}. */
  type Options = {
    /** Applied beneath the written config, for values derived elsewhere such as the origin remote. */
    defaults?: WrittenConfig | undefined
  }
}

/** Reads and normalizes config from disk. A missing file is not an error. */
export async function resolve(options: resolve.Options): Promise<Config> {
  const contents = await fs
    .readFile(path.join(options.root, file), 'utf8')
    .catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return undefined
      throw error
    })

  const written = (() => {
    if (contents === undefined) return {}
    try {
      return JSON.parse(contents)
    } catch (error) {
      throw new MalformedError({ cause: error as Error })
    }
  })()

  return from(written, options.defaults ? { defaults: options.defaults } : {})
}

export declare namespace resolve {
  /** Options for {@link resolve}. */
  type Options = from.Options & {
    /** Repository root. Config is read from `<root>/.agents/friction-log/config.json`. */
    root: string
  }
}

/** Thrown when the config file is not parseable JSON. */
export class MalformedError extends Error {
  /** Namespaced class name. */
  override name = 'Config.MalformedError'
  /** Machine-readable code, surfaced as the CLI error code. */
  code = 'MALFORMED_CONFIG' as const

  constructor(options: MalformedError.Options) {
    super(`\`${file}\` is not valid JSON.`, { cause: options.cause })
  }
}

export declare namespace MalformedError {
  /** Options for {@link MalformedError}. */
  type Options = {
    /** Underlying JSON parse failure. */
    cause: Error
  }
}

/** Thrown when config parses as JSON but fails validation. */
export class InvalidError extends Error {
  /** Namespaced class name. */
  override name = 'Config.InvalidError'
  /** Machine-readable code, surfaced as the CLI error code. */
  code = 'INVALID_CONFIG' as const
  /** Every validation failure, for callers that need more than the message. */
  issues: readonly z.core.$ZodIssue[]

  constructor(options: InvalidError.Options) {
    const details = options.issues
      .map((issue) => `${issue.path.join('.') || 'config'}: ${issue.message}`)
      .join('; ')
    super(`\`${file}\` is invalid. ${details || 'Expected an object.'}`)
    this.issues = options.issues
  }
}

export declare namespace InvalidError {
  /** Options for {@link InvalidError}. */
  type Options = {
    /** Validation failures, summarized into the message and kept for inspection. */
    issues: readonly z.core.$ZodIssue[]
  }
}
