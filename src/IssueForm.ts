import * as YAML from 'yaml'

/** Directory GitHub reads issue templates from. */
export const dir = '.github/ISSUE_TEMPLATE'

/** Filename a project adds to say how it wants friction reported, ahead of its other forms. */
export const filename = 'friction.yml'

/** Configuration file that sits alongside the forms and is not one. */
const config = 'config.yml'

/** Element types that collect an answer. `markdown` is instruction text, so it is excluded. */
const kinds = ['checkboxes', 'dropdown', 'input', 'textarea'] as const

/** How a form element collects its answer. */
export type Kind = (typeof kinds)[number]

/** One answerable element of an issue form. */
export type Field = {
  /** Guidance shown under the label. Not part of a submitted issue. */
  description?: string | undefined
  /** How the answer is collected. */
  kind: Kind
  /** Heading the answer appears under, as a submitted form renders it. */
  label: string
  /** Choices, for a `checkboxes` or `dropdown` field. */
  options?: readonly string[] | undefined
  /** Whether the project requires an answer. */
  required: boolean
}

/** A project's issue form, reduced to what authoring an entry needs. */
export type Form = {
  /** Answerable elements, in the order the project asks for them. */
  fields: readonly Field[]
  /** Labels the project applies to issues filed from this form. */
  labels?: readonly string[] | undefined
  /** Form name, as it appears in GitHub's template chooser. */
  name?: string | undefined
}

/**
 * Parses a GitHub issue form.
 *
 * Only the elements that collect an answer survive. Carrying a `markdown` block into an entry would
 * put the project's own preamble into the issue body it eventually files.
 *
 * @param contents - The form's YAML.
 * @returns The form, or `undefined` when the YAML is unparseable or has no answerable field. Malformed
 * input is a miss rather than a throw: a broken form upstream must not stop an entry being written.
 */
export function parse(contents: string): Form | undefined {
  const document = (() => {
    try {
      return YAML.parse(contents) as Document | undefined
    } catch {
      return undefined
    }
  })()
  if (!document || typeof document !== 'object' || !Array.isArray(document.body)) return undefined

  const fields = document.body
    .filter((element): element is Element => Boolean(element) && typeof element === 'object')
    .map(toField)
    .filter((field): field is Field => field !== undefined)
  if (fields.length === 0) return undefined

  const labels = document.labels?.filter(
    (label): label is string => typeof label === 'string' && label.length > 0,
  )

  return {
    fields,
    ...(labels?.length ? { labels } : {}),
    ...(typeof document.name === 'string' && document.name ? { name: document.name } : {}),
  }
}

/**
 * Renders the markdown an author fills in.
 *
 * Shaped like GitHub's own rendering of a submitted form, `### Label` per field, so an entry written
 * against a project's form arrives looking like one filed through its issue page.
 *
 * Guidance is carried as HTML comments, which render as nothing once the body reaches GitHub.
 *
 * @returns Markdown with a heading per field.
 */
export function scaffold(form: Form): string {
  return `${form.fields.map(render).join('\n\n')}\n`
}

/** Renders one field: its heading, its guidance, and whatever the answer looks like empty. */
function render(field: Field): string {
  const hints = [
    field.description?.replace(/\s+/g, ' ').trim(),
    field.required ? 'Required.' : undefined,
  ].filter(Boolean)

  const options =
    field.kind === 'checkboxes' && field.options?.length
      ? field.options.map((option) => `- [ ] ${option}`).join('\n')
      : undefined

  return [
    `### ${field.label}`,
    hints.length > 0 ? `<!-- ${hints.join(' ')} -->` : undefined,
    options,
  ]
    .filter((part) => part !== undefined)
    .join('\n\n')
}

/**
 * Picks the form to author against, from the files in a project's template directory.
 *
 * `friction.yml` takes precedence: a project that added one is speaking to frog directly. Failing
 * that, a lone form is used, and among several the one named for bugs. Anything less certain resolves
 * to nothing, leaving frog's own sections in place.
 *
 * @param paths - Repository-relative paths of everything in {@link dir}.
 * @returns The path to read, or `undefined` when no form is the obvious one.
 */
export function choose(paths: readonly string[]): string | undefined {
  const forms = paths.filter((path) => {
    const name = path.split('/').at(-1) ?? ''
    return name !== config && /\.ya?ml$/.test(name)
  })

  const friction = forms.find((path) => path.endsWith(`/${filename}`))
  if (friction) return friction

  if (forms.length === 1) return forms[0]
  return forms.find((path) => (path.split('/').at(-1) ?? '').includes('bug'))
}

/**
 * Finds and parses the form a project wants friction written against.
 *
 * Three lookups, cheapest first: the template the project named, then a conventional `friction.yml`,
 * then a listing of the template directory.
 *
 * @param read - Reads a repository file, or `undefined` when it is not there.
 * @param list - Lists the files in a repository directory.
 * @returns The form, or `undefined` when the project has none frog can be sure of. Never throws: every
 * caller has frog's own sections to fall back on.
 */
export async function find(options: find.Options): Promise<Form | undefined> {
  const { list, named, read } = options

  const candidates = [
    // Accept a bare filename alongside a full path.
    named ? (named.includes('/') ? named : `${dir}/${named}`) : undefined,
    `${dir}/${filename}`,
  ].filter((path): path is string => path !== undefined)

  for (const path of candidates) {
    const form = await read(path).then((contents) => contents && parse(contents))
    if (form) return form
  }

  const chosen = choose(await list(dir))
  if (!chosen) return undefined

  const contents = await read(chosen)
  return contents ? parse(contents) : undefined
}

export declare namespace find {
  /** Options for {@link find}. */
  type Options = {
    /** Lists the files directly inside a repository directory. */
    list: (path: string) => Promise<readonly string[]>
    /** Form the project named in its config, as a path or a bare filename. */
    named?: string | undefined
    /** Reads a repository file. */
    read: (path: string) => Promise<string | undefined>
  }
}

/** The shape read out of a form's YAML, before anything is trusted. */
type Document = {
  body?: unknown[] | undefined
  labels?: unknown[] | undefined
  name?: unknown
}

/** One entry of a form's `body`, before anything is trusted. */
type Element = {
  attributes?:
    | { description?: unknown; label?: unknown; options?: unknown[] | undefined }
    | undefined
  type?: unknown
  validations?: { required?: unknown } | undefined
}

/** Converts one form element into a field, dropping anything that collects no answer. */
function toField(element: Element): Field | undefined {
  const kind = kinds.find((value) => value === element.type)
  if (!kind) return undefined

  const label = element.attributes?.label
  if (typeof label !== 'string' || !label) return undefined

  const options = element.attributes?.options
    ?.map((option) =>
      typeof option === 'string'
        ? option
        : typeof (option as { label?: unknown })?.label === 'string'
          ? (option as { label: string }).label
          : undefined,
    )
    .filter((option): option is string => Boolean(option))

  // A checkbox carries `required` per option, and any one of them makes the field required.
  const required =
    element.validations?.required === true ||
    (element.attributes?.options ?? []).some(
      (option) => (option as { required?: unknown })?.required === true,
    )

  const description = element.attributes?.description

  return {
    kind,
    label,
    required,
    ...(typeof description === 'string' && description ? { description } : {}),
    ...(options?.length ? { options } : {}),
  }
}
