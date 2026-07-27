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

/** Frontmatter of an entry's write-up. */
export type Frontmatter = {
  /** Linked issue as `owner/name#number`. Written by publishing, absent while pending. */
  issue?: string | undefined
  /** Extra issue labels, applied on top of the configured and severity labels. */
  labels?: readonly string[] | undefined
  /** How much the friction hurt. Defaults to `minor`. */
  severity: Severity
  /**
   * Where the issue belongs: an npm package or GitHub repository as `owner/repo`.
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
  /** Id of the entry, which is the name of the directory holding it. */
  id: string
}

/**
 * Splits leading YAML frontmatter from the markdown body.
 *
 * Lazy, so the first `---` after the opening one closes the block and a body containing a horizontal
 * rule cannot swallow it. `[^]` rather than `.` because the frontmatter spans newlines.
 */
const frontmatterRegex = /\s*---([^]*?)\n\s*---(\s*(?:\n|$)[^]*)/

/**
 * Parses an entry's write-up.
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
    /** Entry id. Named in errors so they point at a real entry. */
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
  /** The entry to serialize. The id is the directory name, so it is not part of the contents. */
  type Options = Omit<Entry, 'id'>
}

/** Words a slug keeps. Enough to recognize the entry, short enough to stay scannable in a path. */
const maxWords = 3

/** Hard bound on slug length, for a title whose words are pathologically long. */
const maxSlug = 48

/**
 * Turns a title into a path-safe slug.
 *
 * The first few words only: the full title lives in the write-up, so the directory name just has to be
 * recognizable at a glance. Never empty, because a title of nothing but punctuation still has to name a
 * directory.
 *
 * @param title - Title as written.
 * @returns Up to three lowercased words joined by hyphens.
 */
export function slug(title: string): string {
  const words = normalizeTitle(title).split(' ').filter(Boolean)
  return words.slice(0, maxWords).join('-').slice(0, maxSlug) || 'friction'
}

/**
 * Builds an id for a new entry: when the friction was hit, then the title.
 *
 * Timestamped rather than numbered because entries are deleted when their friction is resolved, so a
 * sequence counter would hand the same number to something unrelated. A timestamp is never reused, sorts
 * oldest-first as plain text, and two branches logging at once still get distinct ids.
 *
 * @returns An id such as `20260725143012-filters-are-ignored`.
 */
export function newId(options: newId.Options): string {
  const { date = new Date(), title } = options

  const pad = (value: number) => `${value}`.padStart(2, '0')

  // Local time, not UTC: friction hit late in the evening belongs to the day the reporter was working.
  const stamp = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('')

  return `${stamp}-${slug(title)}`
}

export declare namespace newId {
  /** Options for {@link newId}. */
  type Options = {
    /** When the friction was hit. Defaults to now. */
    date?: Date | undefined
    /** Title of the entry, which becomes the readable part of the id. */
    title: string
  }
}

/** One prompt in the scaffold a new entry starts from. */
export type Section = {
  /** What the section asks for. */
  description: string
  /** Heading it appears under. */
  label: string
}

/**
 * What a friction entry is asked for, in order.
 *
 * Nothing enforces these. They exist so an entry lands as something reproducible rather than a one-line
 * complaint, which is what a flat friction log tends to produce. Expectation is separated from
 * description on purpose: friction is the gap between the two, and naming both is what turns a complaint
 * into a report somebody can act on.
 *
 * Held as data because two things are rendered from it: the markdown scaffold below, and the issue form
 * `init --library` publishes so a consumer's agent finds the same questions.
 */
export const sections: readonly Section[] = [
  {
    description: 'Tell us what should happen.',
    label: 'Expected Behavior',
  },
  {
    description: 'Tell us what happens instead of the expected behavior.',
    label: 'Current Behavior',
  },
  {
    description: 'Not obligatory, but suggest a fix or a reason for the friction.',
    label: 'Possible Solution',
  },
  {
    description:
      'A minimal reproducible example in `artifacts/`, or an unambiguous set of steps to reproduce this. Include code to reproduce, if relevant.',
    label: 'Minimal Reproducible Example',
  },
  {
    description:
      'How has this affected you, and what were you trying to accomplish? Context is what makes a solution useful in the real world rather than in the abstract.',
    label: 'Context',
  },
]

/** Section scaffold a new entry starts from, rendered from {@link sections}. */
export const template = `${sections
  .map((section) => `## ${section.label}\n\n<!-- ${section.description} -->`)
  .join('\n\n')}\n`

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
