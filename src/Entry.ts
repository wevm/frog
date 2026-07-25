import { humanId } from 'human-id'
import { z } from 'incur'
import * as YAML from 'yaml'

/** Every severity, in descending impact order. */
export const severities = ['blocker', 'major', 'minor'] as const

/**
 * How much a friction hurt.
 *
 * `blocker` stopped the work, `major` cost real time, `minor` is a papercut.
 */
export type Severity = (typeof severities)[number]

/** Schema for {@link Severity}. */
export const Severity = z.enum(severities)

/** Frontmatter of an entry file. */
export type Frontmatter = {
  /** Linked issue as `owner/name#number`. Written by publishing, absent while pending. */
  issue?: string | undefined
  /** Extra issue labels, applied on top of the configured and severity labels. */
  labels?: readonly string[] | undefined
  /** How much the friction hurt. Defaults to `minor`. */
  severity: Severity
  /**
   * Where the issue belongs: an npm package, `owner/repo`, or a host.
   *
   * Absent means this repository.
   */
  target?: string | undefined
  /** One line, specific enough to search for. */
  title: string
}

/**
 * Schema for {@link Frontmatter}.
 *
 * Annotated rather than inferred, because TSDoc written on a schema's fields does not survive
 * `z.infer`. The hand-written type above is the documented public shape, and this annotation stops
 * the two drifting: a schema change that alters the parsed shape fails to compile here.
 */
export const Frontmatter: z.ZodType<Frontmatter> = z.object({
  issue: z
    .string()
    .regex(/^[\w.-]+\/[\w.-]+#\d+$/)
    .optional(),
  labels: z.array(z.string().min(1)).optional(),
  severity: Severity.default('minor'),
  target: z.string().min(1).optional(),
  title: z.string().min(1),
})

/** A friction entry: its frontmatter, its markdown body, and the id taken from its filename. */
export type Entry = Frontmatter & {
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
 * Parses an entry file's contents.
 *
 * @example
 * ```ts
 * const entry = Entry.parse(contents, { id: 'lazy-squids-chew' })
 * ```
 *
 * @param contents - Full contents of the file, frontmatter included.
 * @returns The parsed entry, with defaults applied and the body trimmed.
 * @throws {MalformedError} When there is no parseable frontmatter block.
 * @throws {InvalidError} When the frontmatter parses but fails validation.
 */
export function parse(contents: string, options: parse.Options): Entry {
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
  /** Options for {@link parse}. */
  type Options = {
    /** Filename without the `.md` extension. Named in errors so they point at a real file. */
    id: string
  }
}

/**
 * Serializes an entry to file contents.
 *
 * Values are single-quoted: friction titles are full of backticks, colons, and `@scope/pkg`
 * names, none of which survive plain YAML scalars.
 *
 * @example
 * ```ts
 * const contents = Entry.serialize({ body, severity: 'minor', title: 'Filters ignored' })
 * ```
 *
 * @returns File contents, ready to write. Absent optional fields are omitted, not written empty.
 */
export function serialize(entry: serialize.Options): string {
  const { body, issue, labels, severity, target, title } = entry
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
  /** The entry to serialize. The id lives in the filename, so it is not part of the contents. */
  type Options = Omit<Entry, 'id'>
}

/**
 * Generates a collision-resistant, human-readable id for a new entry.
 *
 * Nothing parses the id. It exists only so two branches writing entries at the same time don't
 * conflict, which is exactly why sequential ids were a mistake.
 *
 * @returns A hyphenated lowercase id, such as `lazy-squids-chew`.
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

/**
 * Normalizes a title for duplicate detection: case, whitespace, and punctuation are noise.
 *
 * @param title - Title as written.
 * @returns Lowercased words joined by single spaces, with punctuation dropped.
 */
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
  /** Namespaced class name. */
  override name = 'Entry.MalformedError'
  /** Machine-readable code, surfaced as the CLI error code. */
  code = 'MALFORMED_ENTRY' as const

  constructor(options: MalformedError.Options) {
    super(
      `Entry \`${options.id}\` has no valid YAML frontmatter block.`,
      options.cause ? { cause: options.cause } : {},
    )
  }
}

export declare namespace MalformedError {
  /** Options for {@link MalformedError}. */
  type Options = {
    /** Underlying YAML failure, when there was one. */
    cause?: Error | undefined
    /** Id of the offending entry. */
    id: string
  }
}

/** Thrown when frontmatter parses as YAML but fails validation. */
export class InvalidError extends Error {
  /** Namespaced class name. */
  override name = 'Entry.InvalidError'
  /** Machine-readable code, surfaced as the CLI error code. */
  code = 'INVALID_ENTRY' as const
  /** Every validation failure, for callers that need more than the message. */
  issues: readonly z.core.$ZodIssue[]

  constructor(options: InvalidError.Options) {
    const details = options.issues
      .map((issue) => `${issue.path.join('.') || 'frontmatter'}: ${issue.message}`)
      .join('; ')
    super(`Entry \`${options.id}\` has invalid frontmatter. ${details}`)
    this.issues = options.issues
  }
}

export declare namespace InvalidError {
  /** Options for {@link InvalidError}. */
  type Options = {
    /** Id of the offending entry. */
    id: string
    /** Validation failures, summarized into the message and kept for inspection. */
    issues: readonly z.core.$ZodIssue[]
  }
}
