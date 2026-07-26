import { Cli, z } from 'incur'
import * as Git from '../../Git.js'
import * as Github from '../../Github.js'
import * as Mirrors from '../../Mirrors.js'
import * as Store from '../../Store.js'
import * as Sync from '../../Sync.js'
import { attempt } from '../internal/attempt.js'
import * as context from '../internal/context.js'
import * as publisher from '../internal/publish.js'

export const sync = Cli.create('sync', {
  description: 'Reconcile entries against issue state.',
  env: z.object({
    GH_TOKEN: z.string().optional().describe('Fallback when GITHUB_TOKEN is unset.'),
    GITHUB_API_URL: z
      .string()
      .optional()
      .describe('API base URL. Set automatically inside Actions.'),
    GITHUB_TOKEN: z
      .string()
      .optional()
      .describe('Token used to read issues. Falls back to `gh auth token`.'),
  }),
  options: z.object({
    commit: z
      .boolean()
      .optional()
      .describe('Commit the changes. Defaults to the `commit` config value.'),
    cwd: context.cwdOption,
    dryRun: z.boolean().optional().describe('Report what would change without changing it.'),
    token: z.string().min(1).optional().describe('GitHub token. Overrides the environment.'),
  }),
  alias: { dryRun: 'n' },
  examples: [
    { description: 'Reconcile against issue state' },
    { description: 'See what would change', options: { dryRun: true } },
  ],
  hint: 'Safe to run repeatedly, and safe to run on a schedule. The issue is always canonical.',
  output: z.object({
    cleared: z
      .array(z.string())
      .describe('Entries whose issue is gone. Their link was removed and they are pending again.'),
    committed: z.boolean(),
    removed: z.array(z.string()).describe('Entries whose issue closed. The friction is resolved.'),
    updated: z.array(z.string()).describe('Entries rewritten from their issue, or rebuilt.'),
  }),
  async run(c) {
    const { config, repo, root } = await context.resolve({ cwd: c.options.cwd })

    const entries = await attempt(Store.read({ root }))
    if (!entries.ok) return c.error({ code: entries.code, message: entries.message })
    const mirrors = await attempt(Mirrors.resolve({ root }))
    if (!mirrors.ok) return c.error({ code: mirrors.code, message: mirrors.message })

    const ready = await publisher.prepare({
      config,
      env: c.env,
      repo,
      ...(c.options.token ? { token: c.options.token } : {}),
    })
    if ('code' in ready)
      return c.error({
        ...ready,
        cta: {
          commands: [{ command: 'sync', description: 'Pass --token once one is available' }],
          description: 'Run `gh auth login`, or:',
        },
      })

    // Every repository these entries point at, not just this one. An entry reported upstream is
    // mirrored here, so its issue closing has to be noticed here too. Own repository always included:
    // a reopened issue whose file was deleted has nothing local to notice it by.
    const destinations = [
      ...new Set([
        ready.repo,
        ...entries.value
          .map((entry) => (entry.issue ? Github.parseLink(entry.issue)?.repo : undefined))
          .filter((repo): repo is string => repo !== undefined),
        ...mirrors.value.mirrors
          .map((mirror) => Github.parseLink(mirror.issue)?.repo)
          .filter((repo): repo is string => repo !== undefined),
      ]),
    ]

    const plans: Sync.Plan[] = []
    const forget: Mirrors.Mirror[] = []
    for (const destination of destinations) {
      const remembered = mirrors.value.mirrors.filter(
        (mirror) => Github.parseLink(mirror.issue)?.repo === destination,
      )
      const issues = await attempt(
        Sync.state({
          entries: entries.value,
          get: (issue) => Github.get(ready.client, { issue, repo: destination }),
          list: () => Github.list(ready.client, { label: ready.label, repo: destination }),
          remembered: remembered
            .map((mirror) => Github.parseLink(mirror.issue)?.issue)
            .filter((issue): issue is number => issue !== undefined),
          repo: destination,
        }),
      )
      if (!issues.ok)
        return c.error(
          publisher.toFailure({
            message: issues.message,
            repo: destination,
            ...(issues.status !== undefined ? { status: issues.status } : {}),
          }),
        )

      plans.push(
        Sync.plan({
          entries: entries.value,
          issues: issues.value,
          labels: config.labels,
          mirrors: remembered,
          // The files are always here, whichever repository the issues are in.
          origin: ready.repo,
          repo: destination,
          severityLabels: config.severityLabels,
        }),
      )

      const found = new Set(issues.value.map((issue) => issue.number))
      forget.push(
        ...remembered.filter((mirror) => {
          const link = Github.parseLink(mirror.issue)
          return Boolean(link && !found.has(link.issue))
        }),
      )
    }

    const plan: Sync.Plan = {
      clearLink: plans.flatMap((value) => value.clearLink),
      remove: plans.flatMap((value) => value.remove),
      write: plans.flatMap((value) => value.write),
    }

    const cleared = plan.clearLink.map((entry) => entry.id)
    const removed = [...new Set(plan.remove)]
    const updated = plan.write.map((entry) => entry.id)

    const byId = new Map(entries.value.map((entry) => [entry.id, entry]))
    const remember: Mirrors.Mirror[] = []
    for (const id of removed) {
      const entry = byId.get(id)
      if (entry?.issue) remember.push({ issue: entry.issue, path: Store.toPath(entry.id) })
    }
    forget.push(
      ...plan.write
        .filter((entry): entry is typeof entry & { issue: string } => Boolean(entry.issue))
        .map((entry) => ({ issue: entry.issue, path: Store.toPath(entry.id) })),
    )

    const nextMirrors = Mirrors.update(mirrors.value, { forget, remember })
    const mirrorsChanged = Mirrors.serialize(nextMirrors) !== Mirrors.serialize(mirrors.value)

    if (c.options.dryRun || (Sync.empty(plan) && !mirrorsChanged))
      return c.ok({ cleared, committed: false, removed, updated })

    // Staged before unlinking, so tracked entries have their deletion recorded. The whole directory
    // goes, artifacts included. `ignoreUnmatch` covers entries that were never committed, which are
    // then removed from disk below.
    await Git.rm(removed.map(Store.toDir), { cwd: root, ignoreUnmatch: true })
    for (const id of removed) await Store.remove(id, { root })

    for (const entry of [...plan.write, ...plan.clearLink])
      await Store.write(entry, { id: entry.id, root })
    if (mirrorsChanged) await Mirrors.write(nextMirrors, { root })

    const touched = [...plan.write, ...plan.clearLink].map((entry) => Store.toPath(entry.id))
    if (mirrorsChanged) touched.push(Mirrors.file)
    const committed = await (async () => {
      if (!(c.options.commit ?? config.commit)) return false
      await Git.add(touched, { cwd: root })
      return Git.commit('chore: sync friction log', {
        cwd: root,
        files: [...removed.map(Store.toDir), ...touched],
      })
    })()

    return c.ok(
      { cleared, committed, removed, updated },
      {
        cta: {
          commands: [{ command: 'list', description: 'See what is left' }],
          description: 'Next:',
        },
      },
    )
  },
})
