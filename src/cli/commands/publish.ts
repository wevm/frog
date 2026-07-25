import { Cli, z } from 'incur'
import type * as Frictionset from '../../Frictionset.js'
import * as Store from '../../Store.js'
import { attempt } from '../internal/attempt.js'
import * as context from '../internal/context.js'
import * as publisher from '../internal/publish.js'

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
    const pending: Frictionset.Frictionset[] = []
    for (const entry of entries.value) {
      if (entry.issue) continue
      // Cross-repo targeting needs the consent handshake, which is not wired up yet.
      if (entry.target) deferred.push({ id: entry.id, reason: `target \`${entry.target}\`` })
      else pending.push(entry)
    }

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

    const outcome = await attempt(
      publisher.file({
        ...ready,
        commit: (c.options.commit ?? config.commit) && !c.options.dryRun,
        config,
        entries: publishable,
        root,
        ...(c.options.dryRun ? { dryRun: true } : {}),
        ...(c.options.pr ? { pr: toPr(c.options.pr, ready.repo) } : {}),
      }),
    )
    if (!outcome.ok)
      return c.error(
        publisher.toFailure({
          message: outcome.message,
          repo: ready.repo,
          ...(outcome.status !== undefined ? { status: outcome.status } : {}),
        }),
      )

    return c.ok(
      { ...outcome.value, deferred },
      {
        cta: {
          commands: [{ command: 'list', description: 'See what is still pending' }],
          description: 'Next:',
        },
      },
    )
  },
})
