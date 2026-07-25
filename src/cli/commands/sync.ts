import { Cli, z } from 'incur'
import * as Git from '../../Git.js'
import * as Github from '../../Github.js'
import * as Store from '../../Store.js'
import * as Sync from '../../Sync.js'
import { attempt } from '../internal/attempt.js'
import * as context from '../internal/context.js'
import * as publisher from '../internal/publish.js'

export const sync = Cli.create('sync', {
  description: 'Reconcile recorded friction against issue state.',
  env: z.object({
    GH_TOKEN: z.string().optional().describe('Fallback when GITHUB_TOKEN is unset.'),
    GITHUB_API_URL: z.string().optional().describe('API base URL. Set for you inside Actions.'),
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
          commands: [{ command: 'sync', description: 'Pass --token once you have one' }],
          description: 'Run `gh auth login`, or:',
        },
      })

    // Always a remote read, even with no local entries: a reopened issue whose file was deleted has
    // nothing local to notice it by.
    const issues = await attempt(
      Github.list(ready.client, { label: ready.label, repo: ready.repo }),
    )
    if (!issues.ok)
      return c.error(
        publisher.toFailure({
          message: issues.message,
          repo: ready.repo,
          ...(issues.status !== undefined ? { status: issues.status } : {}),
        }),
      )

    // A linked issue missing from the label listing may just have lost its label. Confirm each one
    // directly before treating it as gone, or removing a label would clear the link and let the next
    // publish open a duplicate. Only the suspicious cases cost a request.
    const listed = new Set(issues.value.map((issue) => issue.number))
    const unlisted = [
      ...new Set(
        entries.value
          .map((entry) => (entry.issue ? Github.parseLink(entry.issue) : undefined))
          .filter((link) => link && link.repo === ready.repo && !listed.has(link.issue))
          .map((link) => link?.issue)
          .filter((issue): issue is number => issue !== undefined),
      ),
    ]

    const confirmed = await attempt(
      Promise.all(unlisted.map((issue) => Github.get(ready.client, { issue, repo: ready.repo }))),
    )
    if (!confirmed.ok)
      return c.error(
        publisher.toFailure({
          message: confirmed.message,
          repo: ready.repo,
          ...(confirmed.status !== undefined ? { status: confirmed.status } : {}),
        }),
      )

    const plan = Sync.plan({
      entries: entries.value,
      issues: [...issues.value, ...confirmed.value.filter((issue) => issue !== undefined)],
      labels: config.labels,
      repo: ready.repo,
      severityLabels: config.severityLabels,
    })

    const cleared = plan.clearLink.map((entry) => entry.id)
    const removed = [...plan.remove]
    const updated = plan.write.map((entry) => entry.id)

    if (c.options.dryRun || Sync.empty(plan))
      return c.ok({ cleared, committed: false, removed, updated })

    // Staged before unlinking, so tracked entries have their deletion recorded. `ignoreUnmatch`
    // covers entries that were never committed, which are then removed from disk below.
    await Git.rm(removed.map(Store.toPath), { cwd: root, ignoreUnmatch: true })
    for (const id of removed) await Store.remove(id, { root })

    for (const entry of [...plan.write, ...plan.clearLink])
      await Store.write(entry, { id: entry.id, root })

    const touched = [...plan.write, ...plan.clearLink].map((entry) => Store.toPath(entry.id))
    const committed = await (async () => {
      if (!(c.options.commit ?? config.commit)) return false
      await Git.add(touched, { cwd: root })
      return Git.commit('chore: sync frictionsets with issues', { cwd: root })
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
