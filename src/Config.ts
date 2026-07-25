import fs from 'node:fs/promises'
import path from 'node:path'
import { z } from 'incur'
import { dir } from './Store.js'

/** Path of the config file, relative to the repository root. */
export const file = `${dir}/config.json`

const repoPattern = /^[\w.-]+\/[\w.-]+$/

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
        .array(z.string().min(1))
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
        .array(z.string().min(1))
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
  site: z.url().optional().describe('Site serving `/.well-known/frictionsets.json`.'),
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

/** Normalized config, with every default applied. */
export type Config = z.output<typeof Schema>

/** Config as written on disk: every field optional. */
export type WrittenConfig = z.input<typeof Schema>

/**
 * Normalizes already-loaded config.
 *
 * The one chokepoint between written and normalized config, so anything reading config over the
 * network (the App, a corroboration check) gets identical defaults to the CLI reading it off disk.
 */
export function from(value: unknown, options: from.Options = {}): Config {
  const written = value ?? {}
  if (typeof written !== 'object' || Array.isArray(written)) throw new InvalidError({ issues: [] })
  const result = Schema.safeParse({ ...options.defaults, ...written })
  if (!result.success) throw new InvalidError({ issues: result.error.issues })
  return result.data
}

export declare namespace from {
  type Options = {
    /** Applied beneath the written config, for values derived elsewhere (e.g. the origin remote). */
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
  type Options = from.Options & {
    /** Repository root. */
    root: string
  }
}

/** Thrown when the config file is not parseable JSON. */
export class MalformedError extends Error {
  override name = 'Config.MalformedError'
  code = 'MALFORMED_CONFIG' as const

  constructor(options: { cause: Error }) {
    super(`\`${file}\` is not valid JSON.`, { cause: options.cause })
  }
}

/** Thrown when config parses as JSON but fails validation. */
export class InvalidError extends Error {
  override name = 'Config.InvalidError'
  code = 'INVALID_CONFIG' as const
  issues: readonly z.core.$ZodIssue[]

  constructor(options: { issues: readonly z.core.$ZodIssue[] }) {
    const details = options.issues
      .map((issue) => `${issue.path.join('.') || 'config'}: ${issue.message}`)
      .join('; ')
    super(`\`${file}\` is invalid. ${details || 'Expected an object.'}`)
    this.issues = options.issues
  }
}
