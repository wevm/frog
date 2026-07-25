import { Frictionset, Github, Store, Sync } from 'frictionsets'
import type { Octokit } from 'octokit'
import * as config from '../internal/config.js'
import * as Repository from '../Repository.js'

/** What reconciling an issue event did. */
export type Outcome = {
  /** Sha of the reconciling commit, or `undefined` when nothing needed changing. */
  committed?: string | undefined
  /** Why nothing was done, when nothing was. */
  ignored?: string | undefined
  /** Repository holding the mirroring files, from the marker. */
  origin?: string | undefined
  /** The plan that was applied. */
  plan?: Sync.Plan | undefined
}

/**
 * Reconciles the files mirroring an issue after it changes.
 *
 * The marker on the issue names both the file and the repository holding it, so a closed issue finds its
 * mirror in one step and without scanning. That `origin` is what makes this work across repositories: an
 * issue closed on an upstream project deletes the entry in the consumer that reported it, so a
 * consumer's directory stays a list of friction that is still unresolved.
 *
 * The decisions come from `Sync.plan`, unchanged, so the App and the CLI cannot disagree about what a
 * closed or reopened issue means.
 *
 * @returns What happened, or why nothing did.
 */
export async function issues(options: issues.Options): Promise<Outcome> {
  const { client, installation, issue, repo } = options

  // Only an issue frictionsets filed can be reconciled: without a marker there is no file to find, and
  // an issue somebody labelled by hand is not ours to act on.
  const marker = Github.parseMarker(issue.body)
  if (!marker?.path) return { ignored: 'no frictionsets marker' }

  const origin = marker.origin ?? repo
  const source = origin === repo ? client : await installation(origin)
  if (!source) return { ignored: `frictionsets is not installed on \`${origin}\``, origin }

  const branch = await Github.defaultBranch(source.rest, { repo: origin })
  if (!branch) return { ignored: `cannot read \`${origin}\``, origin }

  const settings = await config.read(source, { repo: origin })
  const { entries } = await Repository.read(source, { ref: branch, repo: origin })

  // Listed from the repository the issue is in, which is not where the files are. `Sync.state` confirms
  // any linked issue the listing misses, so a label edit is not mistaken for a deletion.
  const target = await config.read(client, { repo })
  const label = target.inbound.labels?.[0] ?? settings.labels[0] ?? 'friction'

  const state = await Sync.state({
    entries,
    get: (number) => Github.get(client.rest, { issue: number, repo }),
    list: () => Github.list(client.rest, { label, repo }),
    repo,
  })

  const plan = Sync.plan({
    entries,
    issues: state,
    labels: settings.labels,
    repo,
    severityLabels: settings.severityLabels,
  })
  if (Sync.empty(plan)) return { origin, plan }

  const committed = await Repository.commit(source, {
    branch,
    deletes: plan.remove.map(Store.toPath),
    message: 'chore: sync frictionsets with issues',
    repo: origin,
    writes: [...plan.write, ...plan.clearLink].map((entry) => ({
      contents: Frictionset.serialize(entry),
      path: Store.toPath(entry.id),
    })),
  })

  return { origin, plan, ...(committed ? { committed } : {}) }
}

export declare namespace issues {
  /** Options for {@link issues}. */
  type Options = {
    /** Installation client for the repository the issue is in. */
    client: Octokit
    /**
     * Resolves an installation client for another repository.
     *
     * The files may live somewhere else entirely, and without an installation there the App cannot
     * reconcile them.
     */
    installation: (repo: string) => Promise<Octokit | undefined>
    /** The issue that changed, from the event payload. */
    issue: Github.Issue
    /** Repository the issue is in, as `owner/name`. */
    repo: string
  }
}
