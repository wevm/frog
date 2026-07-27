import { type Entry, Github } from 'frog'
import type { Octokit } from 'octokit'
import * as Repository from '../Repository.js'

const intro =
  'Opened by the [frog](https://github.com/wevm/frog) GitHub App. Merging syncs the friction log ' +
  'with its issues.'

function link(entry: Entry.Entry): string {
  const parsed = entry.issue ? Github.parseLink(entry.issue) : undefined
  if (!parsed) return `\`${entry.id}\` ${entry.title}`
  return `[${entry.issue}](https://github.com/${parsed.repo}/issues/${parsed.issue}) ${entry.title}`
}

function section(title: string, entries: readonly Entry.Entry[]): string | undefined {
  if (entries.length === 0) return undefined
  return `## ${title}\n\n${entries.map((entry) => `-   ${link(entry)}`).join('\n\n')}`
}

/**
 * Describes what merging the reconciling pull request would do.
 *
 * Derived from the branch rather than from the delivery that last wrote to it. One pull request
 * accumulates several closures, so a description built from one delivery would describe only the most
 * recent and quietly misrepresent the rest.
 *
 * @returns Markdown body.
 */
export function render(options: render.Options): string {
  const { base, branch } = options

  const current = new Map(base.map((entry) => [entry.id, entry]))
  const proposed = new Map(branch.map((entry) => [entry.id, entry]))

  const resolved = base.filter((entry) => !proposed.has(entry.id))
  const reopened = branch.filter((entry) => !current.has(entry.id))
  const linked = branch.filter((entry) => {
    const existing = current.get(entry.id)
    return existing && !existing.issue && entry.issue
  })

  const sections = [
    section('Resolved', resolved),
    section('Reopened', reopened),
    section('Linked', linked),
  ].filter((value) => value !== undefined)

  if (sections.length === 0) return intro
  return `${intro}\n\n${sections.join('\n\n')}`
}

export declare namespace render {
  /** Options for {@link render}. */
  type Options = {
    /** Entries on the branch being merged into. */
    base: readonly Entry.Entry[]
    /** Entries on the reconciling branch. */
    branch: readonly Entry.Entry[]
  }
}

/**
 * Reads both branches and describes the difference between them.
 *
 * @param client - Installation client for the repository.
 * @returns Markdown body for the reconciling pull request.
 */
export async function describe(client: Octokit, options: describe.Options): Promise<string> {
  const { base, branch, repo } = options

  const [current, proposed] = await Promise.all([
    Repository.read(client, { ref: base, repo }),
    Repository.read(client, { ref: branch, repo }),
  ])

  return render({ base: current.entries, branch: proposed.entries })
}

export declare namespace describe {
  /** Options for {@link describe}. */
  type Options = {
    /** Branch the pull request merges into. */
    base: string
    /** Branch the reconciling commits land on. */
    branch: string
    /** Repository holding both, as `owner/name`. */
    repo: string
  }
}
