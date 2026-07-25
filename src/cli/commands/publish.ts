import { Cli, z } from 'incur'
import type * as Frictionset from '../../Frictionset.js'
import * as Git from '../../Git.js'
import * as Store from '../../Store.js'
import * as Target from '../../Target.js'
import { attempt } from '../internal/attempt.js'
import * as context from '../internal/context.js'
import * as publisher from '../internal/publish.js'
import * as target from '../internal/target.js'

/** Normalizes `--pr` into `owner/name#number`, accepting a bare number. */
function toPr(value: string, repo: string): string {
  return value.includes('#') ? value : `${repo}#${value.replace(/^#/, '')}`
}

export const publish = Cli.create('publish', {
  description: 'File recorded friction as GitHub issues.',
  env: z.object({
    GH_TOKEN: z.string().optional().describe('Fallback when GITHUB_TOKEN is unset.'),
    GITHUB_API_URL: z.string().optional().describe('API base URL. Set for you inside Actions.'),
    GITHUB_TOKEN: z
      .string()
      .optional()
      .describe('Token used to file issues. Falls back to `gh auth token`.'),
  }),
  options: z.object({
    commit: z
      .boolean()
      .optional()
      .describe('Commit the issue links. Defaults to the `commit` config value.'),
    cwd: context.cwdOption,
    dryRun: z.boolean().optional().describe('Report what would be filed without filing it.'),
    max: z.coerce
      .number()
      .int()
      .positive()
      .optional()
      .describe('Ceiling for this run. Defaults to the `maxPerRun` config value.'),
    pr: z
      .string()
      .min(1)
      .optional()
      .describe('Pull request this is filed from, as `owner/name#number` or a bare number.'),
    token: z.string().min(1).optional().describe('GitHub token. Overrides the environment.'),
  }),
  alias: { dryRun: 'n' },
  examples: [
    { description: 'File everything pending' },
    { description: 'See what would be filed', options: { dryRun: true } },
  ],
  hint: 'Needs a token: GITHUB_TOKEN, GH_TOKEN, --token, or an authenticated `gh`.',
  output: z.object({
    commented: z
      .array(z.object({ id: z.string(), issue: z.string() }))
      .describe('Entries that landed on an issue that already covered them.'),
    committed: z.boolean().describe('Whether the issue links were committed.'),
    created: z.array(z.object({ id: z.string(), issue: z.string() })),
    deferred: z
      .array(z.object({ id: z.string(), reason: z.string() }))
      .describe('Entries left pending, and why.'),
  }),
  async run(c) {
    const { config, repo, root } = await context.resolve({ cwd: c.options.cwd })

    const entries = await attempt(Store.read({ root }))
    if (!entries.ok) return c.error({ code: entries.code, message: entries.message })

    const deferred: { id: string; reason: string }[] = []
    const pending = entries.value.filter((entry) => !entry.issue)

    const max = c.options.max ?? config.maxPerRun
    for (const entry of pending.slice(max))
      deferred.push({ id: entry.id, reason: `over the ceiling of ${max} per run` })
    const publishable = pending.slice(0, max)

    if (publishable.length === 0)
      return c.ok({ commented: [], committed: false, created: [], deferred })

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
          commands: [{ command: 'publish', description: 'Pass --token once you have one' }],
          description: 'Run `gh auth login`, or:',
        },
      })

    // Each entry's target is resolved through the consent gates before anything is filed, and entries
    // are grouped by destination so one repository costs one index lookup however many entries it has.
    const resolvers = target.resolvers({
      allowedRepos: config.outbound.allowedRepos,
      client: ready.client,
      root,
      self: ready.repo,
    })

    type Group = { entries: Frictionset.Frictionset[]; labels?: readonly string[] | undefined }
    const groups = new Map<string, Group>()

    for (const entry of publishable) {
      const resolution = await attempt(Target.resolve(entry.target, resolvers))
      if (!resolution.ok) {
        deferred.push({ id: entry.id, reason: resolution.message })
        continue
      }
      if (!resolution.value.ok) {
        deferred.push({ id: entry.id, reason: resolution.value.message })
        continue
      }

      const { labels, repo: destination } = resolution.value.target
      const group = groups.get(destination) ?? {
        entries: [],
        ...(labels ? { labels } : {}),
      }
      group.entries.push(entry)
      groups.set(destination, group)
    }

    const commented: publisher.Link[] = []
    const created: publisher.Link[] = []
    const written: string[] = []

    for (const [destination, group] of groups) {
      const outcome = await attempt(
        publisher.file({
          ...ready,
          config,
          entries: group.entries,
          origin: ready.repo,
          repo: destination,
          root,
          ...(group.labels ? { labels: group.labels } : {}),
          ...(c.options.dryRun ? { dryRun: true } : {}),
          ...(c.options.pr ? { pr: toPr(c.options.pr, ready.repo) } : {}),
        }),
      )
      if (!outcome.ok)
        return c.error(
          publisher.toFailure({
            message: outcome.message,
            repo: destination,
            ...(outcome.status !== undefined ? { status: outcome.status } : {}),
          }),
        )

      commented.push(...outcome.value.commented)
      created.push(...outcome.value.created)
      written.push(...outcome.value.written)
    }

    // One commit, however many destinations were involved.
    const committed = await (async () => {
      if (!(c.options.commit ?? config.commit) || c.options.dryRun || written.length === 0)
        return false
      await Git.add(written, { cwd: root })
      return Git.commit('chore: link frictionsets to issues', { cwd: root })
    })()

    return c.ok(
      { commented, committed, created, deferred },
      {
        cta: {
          commands: [{ command: 'list', description: 'See what is still pending' }],
          description: 'Next:',
        },
      },
    )
  },
})
