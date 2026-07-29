import fs from 'node:fs/promises'
import path from 'node:path'
import * as Config from '../../Config.js'
import * as Github from '../../Github.js'
import * as IssueForm from '../../IssueForm.js'
import * as Target from '../../Target.js'
import * as octokit from './octokit.js'
import * as target from './target.js'

/**
 * Renders the scaffold an entry aimed at another project should be written against.
 *
 * A project judges a report by its own form. The form is fetched at authoring time, when the answers get
 * written.
 *
 * A token is used when one is around, for the rate limit rather than the access. A public project's
 * issue form reads fine anonymously.
 *
 * @param value - The `--target` as written.
 * @returns The scaffold, or `undefined` when the target resolves to nothing, refuses reports, or has no
 * form Frog can be sure of. Every one of those leaves Frog's own sections in place.
 */
export async function scaffold(
  value: string,
  options: scaffold.Options,
): Promise<string | undefined> {
  const { env, outbound, root, self } = options

  const token = await octokit.token({ env, ...(options.token ? { token: options.token } : {}) })
  const client = octokit.client({
    ...(token ? { token } : {}),
    ...(env.GITHUB_API_URL ? { baseUrl: env.GITHUB_API_URL } : {}),
  })

  const resolution = await Target.resolve(value, target.resolvers({ client, outbound, root, self }))
  // A refused target is reported by publishing, which says why. Here it only means there is no form to
  // write against.
  if (!resolution.ok || resolution.target.kind === 'self') return undefined

  const { repo, template } = resolution.target
  const form = await IssueForm.find({
    list: (path) => Github.listFiles(client, { path, repo }),
    read: (path) => Github.fetchFile(client, { path, repo }),
    ...(template ? { named: template } : {}),
  })

  return form ? IssueForm.scaffold(form) : undefined
}

export declare namespace scaffold {
  /** Options for {@link scaffold}. */
  type Options = {
    /** Outbound policy from config: whether to report at all, and where. */
    outbound: Config.Outbound
    /** Environment, for the API base URL and the token. */
    env: octokit.token.Options['env'] & { GITHUB_API_URL?: string | undefined }
    /** Repository root, holding `node_modules`. */
    root: string
    /** This repository, as `owner/name`. */
    self: string | undefined
    /** Explicit token, overriding the environment. */
    token?: string | undefined
  }
}

/**
 * Renders the scaffold an entry about this repository should be written against.
 *
 * The same discovery as an upstream target, off disk rather than over the API.
 *
 * @param root - Repository root.
 * @returns The form, or `undefined` when this repository publishes no form.
 */
export async function own(
  root: string,
  options: own.Options = {},
): Promise<IssueForm.Form | undefined> {
  return IssueForm.find({
    list: (at) =>
      fs
        .readdir(path.join(root, at))
        .then((names) => names.map((name) => `${at}/${name}`))
        .catch(() => []),
    read: (at) => fs.readFile(path.join(root, at), 'utf8').catch(() => undefined),
    ...(options.named ? { named: options.named } : {}),
  })
}

export declare namespace own {
  type Options = {
    /** Form named by this repository's inbound configuration. */
    named?: string | undefined
  }
}

/**
 * Checks that a supplied body preserves an issue form's headings and required answers.
 *
 * Optional fields still need their headings because the project chose the complete form shape. Their
 * answers may remain empty.
 *
 * @param issueForm - The repository's issue form.
 * @param body - Markdown supplied by the author.
 * @returns Missing or out-of-order headings and required fields without answers.
 */
export function validate(issueForm: IssueForm.Form, body: string): validate.Result {
  const headings = parseHeadings(body)

  const missing: string[] = []
  const matched: { field: IssueForm.Field; heading: (typeof headings)[number] }[] = []
  let cursor = -1

  for (const field of issueForm.fields) {
    const index = headings.findIndex(
      (heading, index) => index > cursor && heading.label === field.label,
    )
    if (index === -1) {
      missing.push(field.label)
      continue
    }
    matched.push({ field, heading: headings[index]! })
    cursor = index
  }

  const unanswered = matched
    .filter(({ field }, index) => {
      if (!field.required) return false
      const current = matched[index]!
      const next = matched[index + 1]
      const answer = body
        .slice(current.heading.end, next?.heading.start)
        .replace(/<!--[^]*?-->/g, '')
        .trim()
      if (field.kind === 'checkboxes') {
        const checked = new Set(
          [...answer.matchAll(/^\s*-\s*\[[xX]\]\s+(.+?)\s*$/gm)].map(
            (match) => match[1]?.trim() ?? '',
          ),
        )
        if (field.requiredOptions?.some((option) => !checked.has(option))) return true
        return field.required && checked.size === 0
      }
      return answer.length === 0
    })
    .map(({ field }) => field.label)

  return { missing, unanswered }
}

/** ATX headings outside fenced code blocks, with body offsets for section slicing. */
function parseHeadings(body: string) {
  const headings: { end: number; label: string; start: number }[] = []
  let fence: { marker: '`' | '~'; size: number } | undefined
  let offset = 0

  for (const terminated of body.match(/[^\n]*(?:\n|$)/g) ?? []) {
    if (!terminated) continue
    const line = terminated.replace(/\r?\n$/, '')

    if (fence) {
      const currentFence = fence
      const closing = /^ {0,3}(`+|~+)[ \t]*$/.exec(line)?.[1]
      if (closing?.startsWith(currentFence.marker) && closing.length >= currentFence.size)
        fence = undefined
      offset += terminated.length
      continue
    }

    const opening = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1]
    if (opening) {
      fence = { marker: opening[0] as '`' | '~', size: opening.length }
      offset += terminated.length
      continue
    }

    const heading = /^ {0,3}(#{1,6})[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/.exec(line)
    if (heading)
      headings.push({
        end: offset + line.length,
        label: heading[2]?.trim() ?? '',
        start: offset,
      })
    offset += terminated.length
  }

  return headings
}

export declare namespace validate {
  type Result = {
    /** Form headings absent from the body or appearing in the wrong order. */
    missing: readonly string[]
    /** Required fields whose sections contain no answer. */
    unanswered: readonly string[]
  }
}
