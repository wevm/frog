import type * as Frictionset from './Frictionset.js'
import * as Github from './Github.js'
import * as Store from './Store.js'

/** Edits that bring local entries back in line with issue state. */
export type Plan = {
  /**
   * Entries whose linked issue no longer exists.
   *
   * Written back without the link, returning them to pending so publishing can file them again.
   */
  clearLink: readonly Frictionset.Frictionset[]
  /** Ids of entries whose issue closed. The friction is resolved, so the mirror goes away. */
  remove: readonly string[]
  /** Entries to write: content pulled from their issue, or rebuilt for one that reopened. */
  write: readonly Frictionset.Frictionset[]
}

/**
 * Works out what reconciling would change, without changing anything.
 *
 * Pure by design, for two reasons. The CLI applies a plan with git while the App applies the same plan
 * through the GitHub API, so the decisions cannot live in either. And this is the only stateful corner
 * of the system, which makes it the one worth testing exhaustively without any I/O.
 *
 * The issue is canonical, so this only ever pulls issue into file. That is what removes the need for a
 * watermark recording when the last sync ran: there is no "who changed last" question to answer, and a
 * maintainer's edits on an issue can never be clobbered. The one push, file into issue, belongs to the
 * App's pull request handler, where a diff proves the file actually changed.
 *
 * @returns The edits to apply. Applying a plan and re-planning yields an empty plan.
 */
export function plan(options: plan.Options): Plan {
  const { entries, issues, labels, repo, severityLabels } = options
  // Where the files are, which is only the same as where the issues are when reporting to yourself.
  const origin = options.origin ?? repo

  const byNumber = new Map(issues.map((issue) => [issue.number, issue]))
  const present = new Set(entries.map((entry) => Store.toPath(entry.id)))

  const clearLink: Frictionset.Frictionset[] = []
  const remove: string[] = []
  const write: Frictionset.Frictionset[] = []

  for (const entry of entries) {
    if (!entry.issue) continue

    const link = Github.parseLink(entry.issue)
    // A link into another repository is not ours to reconcile from here.
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

    // Only an issue frictionsets filed can be rebuilt: the marker is what names the file. An issue
    // somebody labelled by hand is left alone rather than materialized as an entry here.
    const marker = Github.parseMarker(issue.body)
    if (!marker?.path) continue
    // The marker names the repository holding the file, so this compares against `origin`. Comparing
    // against `repo` would refuse to rebuild any file mirroring an upstream issue.
    if (marker.origin && marker.origin !== origin) continue
    if (present.has(marker.path)) continue

    const id = Store.toId(marker.path)
    if (id) write.push(Github.fromIssue(issue, { id, labels, repo, severityLabels }))
  }

  return { clearLink, remove, write }
}

export declare namespace plan {
  /** Options for {@link plan}. */
  type Options = {
    /** Every local entry, from `Store.read`. */
    entries: readonly Frictionset.Frictionset[]
    /** Every issue frictionsets manages in `repo`, from `Github.list`. */
    issues: readonly Github.Issue[]
    /** Labels applied to every issue, from config. */
    labels: readonly string[]
    /**
     * Repository holding the entry files, as `owner/name`. Defaults to `repo`.
     *
     * Differs from `repo` whenever friction was reported upstream: the issues are there, the files are
     * here. A marker records this one, so rebuilding a deleted file matches against it.
     */
    origin?: string | undefined
    /** Repository the issues live in, as `owner/name`. */
    repo: string
    /** Label to apply for each severity, from config. */
    severityLabels: Record<Frictionset.Severity, string>
  }
}

/** Whether a plan would change anything. */
export function empty(plan: Plan): boolean {
  return plan.clearLink.length === 0 && plan.remove.length === 0 && plan.write.length === 0
}

/**
 * Assembles the issue set {@link plan} needs.
 *
 * A linked issue absent from the listing may simply have lost its label, so each one is confirmed
 * directly before {@link plan} can conclude it is gone. Skipping this turns a label edit into a
 * cleared link, and the next publish into a duplicate issue.
 *
 * Shared by both adapters through injected lookups: the CLI reads with a user token, the App with an
 * installation token, and the reconciliation must not differ between them.
 *
 * @returns Every issue relevant to reconciling `repo`, listing plus confirmations.
 */
export async function state(options: state.Options): Promise<readonly Github.Issue[]> {
  const { entries, get, list, repo } = options

  const listed = await list()
  const known = new Set(listed.map((issue) => issue.number))

  const unlisted = [
    ...new Set(
      entries
        .map((entry) => (entry.issue ? Github.parseLink(entry.issue) : undefined))
        .filter((link) => link && link.repo === repo && !known.has(link.issue))
        .map((link) => link?.issue)
        .filter((issue): issue is number => issue !== undefined),
    ),
  ]

  const confirmed = await Promise.all(unlisted.map((issue) => get(issue)))
  return [...listed, ...confirmed.filter((issue) => issue !== undefined)]
}

export declare namespace state {
  /** Options for {@link state}. */
  type Options = {
    /** Every local entry, from `Store.read` or the API. */
    entries: readonly Frictionset.Frictionset[]
    /** Fetches one issue by number, resolving to `undefined` when it does not exist. */
    get: (issue: number) => Promise<Github.Issue | undefined>
    /** Lists the issues frictionsets manages in `repo`. */
    list: () => Promise<readonly Github.Issue[]>
    /** Repository being reconciled, as `owner/name`. */
    repo: string
  }
}
