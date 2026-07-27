import type * as Entry from './Entry.js'
import * as Github from './Github.js'
import type * as Mirrors from './Mirrors.js'
import * as Store from './Store.js'

/** Edits that bring local entries back in line with issue state. */
export type Plan = {
  /**
   * Entries whose linked issue no longer exists.
   *
   * Written back without the link, returning them to pending.
   */
  clearLink: readonly Entry.Entry[]
  /** Ids of entries whose issue closed. */
  remove: readonly string[]
  /** Entries to write: content pulled from their issue, or rebuilt for one that reopened. */
  write: readonly Entry.Entry[]
}

/**
 * Computes what reconciling would change, without changing anything.
 *
 * Pure because the CLI applies a plan with git while the App applies the same plan through the GitHub
 * API.
 *
 * Pulls issue into file only. The issue is canonical, so a maintainer's edits on an issue can never be
 * clobbered. The one push, file into issue, belongs to the App's pull request handler.
 *
 * @returns The edits to apply. Applying a plan and re-planning yields an empty plan.
 */
export function plan(options: plan.Options): Plan {
  const { entries, issues, labels, mirrors = [], repo } = options
  // Where the files are. Only the same as where the issues are when reporting to yourself.
  const origin = options.origin ?? repo

  const byNumber = new Map(issues.map((issue) => [issue.number, issue]))
  const present = new Set(entries.map((entry) => Store.toPath(entry.id)))
  const remembered = new Map<number, string[]>()
  for (const mirror of mirrors) {
    const link = Github.parseLink(mirror.issue)
    if (!link || link.repo !== repo) continue
    const paths = remembered.get(link.issue) ?? []
    paths.push(mirror.path)
    remembered.set(link.issue, paths)
  }

  const clearLink: Entry.Entry[] = []
  const remove: string[] = []
  const write: Entry.Entry[] = []

  for (const entry of entries) {
    if (!entry.issue) continue

    const link = Github.parseLink(entry.issue)
    // A link into another repository is not reconciled from here.
    if (!link || link.repo !== repo) continue

    const issue = byNumber.get(link.issue)
    if (!issue) {
      const { issue: _, ...cleared } = entry
      clearLink.push(cleared)
      continue
    }

    if (issue.state === 'closed') {
      remove.push(entry.id)
      continue
    }

    const body = Github.parseBody(issue.body)
    if (entry.title !== issue.title || entry.body !== body)
      write.push({ ...entry, body, title: issue.title })
  }

  for (const issue of issues) {
    if (issue.state !== 'open') continue

    const marker = Github.parseMarker(issue.body)
    const paths = remembered.get(issue.number) ?? (marker?.path ? [marker.path] : [])
    for (const path of paths) {
      // Without a remembered binding, only an issue frog itself filed can be rebuilt. The marker
      // names the repository holding the file, so compare it against `origin`, not the issue repo.
      if (!remembered.has(issue.number) && marker?.origin && marker.origin !== origin) continue
      if (present.has(path)) continue

      const id = Store.toId(path)
      if (!id) continue
      write.push(Github.fromIssue(issue, { id, labels, repo }))
      present.add(path)
    }
  }

  return { clearLink, remove, write }
}

export declare namespace plan {
  /** Options for {@link plan}. */
  type Options = {
    /** Every local entry, from `Store.read`. */
    entries: readonly Entry.Entry[]
    /** Every issue frog manages in `repo`, from `Github.list`. */
    issues: readonly Github.Issue[]
    /** Labels applied to every issue, from config. */
    labels: readonly string[]
    /** Trusted issue-to-path bindings remembered when mirrors were deleted. */
    mirrors?: readonly Mirrors.Mirror[] | undefined
    /**
     * Repository holding the entries, as `owner/name`. Defaults to `repo`.
     *
     * Differs from `repo` whenever friction was reported upstream: the issues are there, the files are
     * here.
     */
    origin?: string | undefined
    /** Repository the issues live in, as `owner/name`. */
    repo: string
  }
}

/** Whether a plan would change anything. */
export function empty(plan: Plan): boolean {
  return plan.clearLink.length === 0 && plan.remove.length === 0 && plan.write.length === 0
}

/**
 * Assembles the issue set {@link plan} needs.
 *
 * A linked issue absent from the listing may simply have lost its label. Each one is confirmed directly,
 * so a label edit does not become a cleared link and then a duplicate issue.
 *
 * Lookups are injected: the CLI reads with a user token, the App with an installation token.
 *
 * @returns Every issue relevant to reconciling `repo`, listing plus confirmations.
 */
export async function state(options: state.Options): Promise<readonly Github.Issue[]> {
  const { entries, get, list, remembered = [], repo } = options

  const listed = await list()
  const known = new Set(listed.map((issue) => issue.number))

  const unlisted = [
    ...new Set(
      [
        ...entries
          .map((entry) => (entry.issue ? Github.parseLink(entry.issue) : undefined))
          .filter((link) => link && link.repo === repo)
          .map((link) => link?.issue)
          .filter((issue): issue is number => issue !== undefined),
        ...remembered,
      ].filter((issue) => !known.has(issue)),
    ),
  ]

  const confirmed = await Promise.all(unlisted.map((issue) => get(issue)))
  return [...listed, ...confirmed.filter((issue) => issue !== undefined)]
}

export declare namespace state {
  /** Options for {@link state}. */
  type Options = {
    /** Every local entry, from `Store.read` or the API. */
    entries: readonly Entry.Entry[]
    /** Fetches one issue by number, resolving to `undefined` when it does not exist. */
    get: (issue: number) => Promise<Github.Issue | undefined>
    /** Lists the issues frog manages in `repo`. */
    list: () => Promise<readonly Github.Issue[]>
    /** Issue numbers remembered after their final local mirrors were removed. */
    remembered?: readonly number[] | undefined
    /** Repository being reconciled, as `owner/name`. */
    repo: string
  }
}
