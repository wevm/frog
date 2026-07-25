import { humanId } from 'human-id'
import { z } from 'incur'
import * as YAML from 'yaml'

/** Friction severity, in descending impact order. */
export const severities = ['blocker', 'major', 'minor'] as const

export const Severity = z.enum(severities)
export type Severity = z.infer<typeof Severity>

/** Frontmatter of a frictionset file. */
export const Frontmatter = z.object({
  /** Linked issue as `owner/name#number`. Written by `publish`, absent while pending. */
  issue: z
    .string()
    .regex(/^[\w.-]+\/[\w.-]+#\d+$/)
    .optional(),
  /** Extra issue labels. */
  labels: z.array(z.string().min(1)).optional(),
  severity: Severity.default('minor'),
  /** Where the issue belongs. Absent means the current repo. See `Target.resolve`. */
  target: z.string().min(1).optional(),
  title: z.string().min(1),
})
export type Frontmatter = z.infer<typeof Frontmatter>

export type Frictionset = Frontmatter & {
  /** Markdown body: everything after the frontmatter block. */
  body: string
  /** Filename without the `.md` extension. */
  id: string
}

/**
 * Splits leading YAML frontmatter from the markdown body.
 *
 * Lifted from `@changesets/parse`, which has run against every changeset ever written.
 */
const frontmatterRegex = /\s*---([^]*?)\n\s*---(\s*(?:\n|$)[^]*)/

/**
 * Parses a frictionset file's contents.
 *
 * @example
 * ```ts
 * const frictionset = Frictionset.parse(contents, { id: 'lazy-squids-chew' })
 * ```
 */
export function parse(contents: string, options: parse.Options): Frictionset {
  const { id } = options

  const match = frontmatterRegex.exec(contents)
  if (!match) throw new MalformedError({ id })
  const [, frontmatter = '', body = ''] = match

  const data = (() => {
    try {
      return YAML.parse(frontmatter)
    } catch (error) {
      throw new MalformedError({ cause: error as Error, id })
    }
  })()

  const result = Frontmatter.safeParse(data)
  if (!result.success) throw new InvalidError({ id, issues: result.error.issues })

  return { ...result.data, body: body.trim(), id }
}

export declare namespace parse {
  type Options = {
    /** Filename without the `.md` extension, used to make errors actionable. */
    id: string
  }
}

/**
 * Serializes a frictionset to file contents.
 *
 * Values are single-quoted: friction titles are full of backticks, colons, and `@scope/pkg`
 * names, none of which survive plain YAML scalars.
 *
 * @example
 * ```ts
 * const contents = Frictionset.serialize({ body, severity: 'minor', title: 'Filters ignored' })
 * ```
 */
export function serialize(frictionset: serialize.Options): string {
  const { body, issue, labels, severity, target, title } = frictionset
  const frontmatter = YAML.stringify(
    {
      title,
      severity,
      ...(target ? { target } : {}),
      ...(labels?.length ? { labels } : {}),
      ...(issue ? { issue } : {}),
    },
    { defaultKeyType: 'PLAIN', defaultStringType: 'QUOTE_SINGLE', lineWidth: 0 },
  )
  return `---\n${frontmatter}---\n\n${body.trim()}\n`
}

export declare namespace serialize {
  type Options = Omit<Frictionset, 'id'>
}

/**
 * Generates a collision-resistant, human-readable id for a new frictionset.
 *
 * Nothing parses the id. It exists only so two branches writing entries at the same time don't
 * conflict, which is exactly why sequential ids were a mistake.
 */
export function newId(): string {
  return humanId({ capitalize: false, separator: '-' })
}

/**
 * Section scaffold for a new entry.
 *
 * Nothing enforces these sections. They exist so an entry lands as something actionable rather
 * than a one-line complaint, which is what a flat friction log tends to produce.
 */
export const template = `## Description

What you expected, what happened instead, and the exact error text if there was one.

## Reproduction

The smallest steps or snippet that shows it.

## Workaround

What you did instead, if anything.

## Suggested fix

The smallest durable change that would remove this friction.
`

/** Normalizes a title for duplicate detection: case, whitespace, and punctuation are noise. */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ')
}

/** Thrown when a file has no parseable frontmatter block. */
export class MalformedError extends Error {
  override name = 'Frictionset.MalformedError'
  code = 'MALFORMED_FRICTIONSET' as const

  constructor(options: MalformedError.Options) {
    super(
      `Frictionset \`${options.id}\` has no valid YAML frontmatter block.`,
      options.cause ? { cause: options.cause } : {},
    )
  }
}

export declare namespace MalformedError {
  type Options = {
    cause?: Error | undefined
    id: string
  }
}

/** Thrown when frontmatter parses as YAML but fails validation. */
export class InvalidError extends Error {
  override name = 'Frictionset.InvalidError'
  code = 'INVALID_FRICTIONSET' as const
  issues: readonly z.core.$ZodIssue[]

  constructor(options: InvalidError.Options) {
    const details = options.issues
      .map((issue) => `${issue.path.join('.') || 'frontmatter'}: ${issue.message}`)
      .join('; ')
    super(`Frictionset \`${options.id}\` has invalid frontmatter. ${details}`)
    this.issues = options.issues
  }
}

export declare namespace InvalidError {
  type Options = {
    id: string
    issues: readonly z.core.$ZodIssue[]
  }
}
