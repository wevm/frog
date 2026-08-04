import { Cli, z } from 'incur'
import type * as Entry from '../../Entry.js'
import * as Git from '../../Git.js'
import * as Github from '../../Github.js'
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
  description: 'Publish friction entries as GitHub issues.',
  env: z.object({
    GH_TOKEN: z.string().optional().describe('Fallback when GITHUB_TOKEN is unset.'),
    GITHUB_API_URL: z
      .string()
      .optional()
      .describe('API base URL. Set automatically inside Actions.'),
    GITHUB_TOKEN: z
      .string()
      .optional()
      .describe('Token used to file issues. Falls back to `gh auth token`.'),
  }),
  options: z.object({
    commit: z
      .boolean()
      .optional()
      .describe('Commit the issue links. On by default; pass `--no-commit` to leave them staged.'),
    cwd: context.cwdOption,
    dryRun: z.boolean().optional().describe('Report what would be filed without filing it.'),
    expectedAuthor: z
      .string()
      .min(1)
      .optional()
      .describe('Issue author trusted for automated matching and replay markers.'),
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
      .array(z.object({ id: z.string(), issue: z.string(), title: z.string() }))
      .describe('Entries that landed on an issue that already covered them.'),
    committed: z.boolean().describe('Whether the issue links were committed.'),
    created: z.array(z.object({ id: z.string(), issue: z.string(), title: z.string() })),
    deferred: z
      .array(z.object({ code: z.string(), id: z.string(), reason: z.string() }))
      .describe('Entries left pending, and why.'),
    unlabelled: z
      .array(z.string())
      .describe('Destinations that dropped the labels. This token cannot label there.'),
  }),
  async run(c) {
    const { config, repo, root } = await context.resolve({ cwd: c.options.cwd })

    if (Store.activeName() !== 'file')
      return c.error({
        code: 'STORE_UNSUPPORTED_COMMAND',
        message:
          '`publish` requires the repository file store because issue reconciliation is repository-owned.',
      })

    const entries = await attempt(Store.read({ root }))
    if (!entries.ok) return c.error({ code: entries.code, message: entries.message })

    const deferred: { code: string; id: string; reason: string }[] = []
    const publishable = entries.value

    const max = c.options.max ?? config.maxPerRun
    if (publishable.length === 0)
      return c.ok({ commented: [], committed: false, created: [], deferred, unlabelled: [] })

    if (
      publishable.some((entry) => !entry.issue) &&
      c.options.commit !== false &&
      !c.options.dryRun &&
      !(await Git.identity({ cwd: root }))
    )
      return c.error({
        code: 'NO_GIT_IDENTITY',
        message: 'Configure both `user.name` and `user.email` before Frog commits issue links.',
      })

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
          commands: [{ command: 'publish', description: 'Pass --token once one is available' }],
          description: 'Run `gh auth login`, or:',
        },
      })

    // Resolve every target before filing. Candidates stay in entry order so failures can return their
    // ceiling slot to the next report without changing which successful entries make the cut.
    const resolvers = target.resolvers({
      outbound: config.outbound,
      client: ready.client,
      root,
      self: ready.repo,
    })

    type Candidate = {
      destination: string
      entry: Entry.Entry
      labels?: readonly string[] | undefined
    }
    const candidates: Candidate[] = []

    for (const entry of publishable) {
      const link = entry.issue ? Github.parseLink(entry.issue) : undefined
      const resolution = await attempt(Target.resolve(link?.repo ?? entry.target, resolvers))
      if (!resolution.ok) {
        deferred.push({ code: resolution.code, id: entry.id, reason: resolution.message })
        continue
      }
      if (!resolution.value.ok) {
        deferred.push({
          code: resolution.value.code,
          id: entry.id,
          reason: resolution.value.message,
        })
        continue
      }

      const { labels, repo: destination } = resolution.value.target
      candidates.push({ destination, entry, ...(labels ? { labels } : {}) })
    }

    const commented: publisher.Link[] = []
    const created: publisher.Link[] = []
    const unlabelled: string[] = []
    const written: string[] = []

    let consumed = 0
    let cursor = 0
    while (cursor < candidates.length) {
      const remaining = max - consumed
      if (remaining === 0) {
        for (const { entry } of candidates.slice(cursor))
          deferred.push({
            code: 'OVER_CEILING',
            id: entry.id,
            reason: `over the ceiling of ${max} per run`,
          })
        break
      }

      // A batch contains at most the capacity still available. Grouping within it keeps the normal path
      // to one issue index per destination; a failed group frees capacity for the next ordered batch.
      const batch = candidates.slice(cursor, cursor + remaining)
      cursor += batch.length

      type Group = { entries: Entry.Entry[]; labels?: readonly string[] | undefined }
      const groups = new Map<string, Group>()
      for (const candidate of batch) {
        const group = groups.get(candidate.destination) ?? {
          entries: [],
          ...(candidate.labels ? { labels: candidate.labels } : {}),
        }
        group.entries.push(candidate.entry)
        groups.set(candidate.destination, group)
      }

      for (const [destination, group] of groups) {
        const result = await attempt(
          publisher
            .file({
              ...ready,
              config,
              entries: group.entries,
              ...(c.options.expectedAuthor ? { expectedAuthor: c.options.expectedAuthor } : {}),
              origin: ready.repo,
              repo: destination,
              root,
              ...(group.labels ? { labels: group.labels } : {}),
              ...(c.options.dryRun ? { dryRun: true } : {}),
              ...(c.options.pr ? { pr: toPr(c.options.pr, ready.repo) } : {}),
            })
            .catch((error: unknown) => {
              if (error instanceof publisher.PartialError) return error
              throw error
            }),
        )
        if (!result.ok) {
          const failure = publisher.toFailure({
            message: result.message,
            repo: destination,
            ...(result.status !== undefined ? { status: result.status } : {}),
          })
          for (const entry of group.entries)
            deferred.push({
              code: failure.code,
              id: entry.id,
              reason: failure.message,
            })
          continue
        }

        const outcome =
          result.value instanceof publisher.PartialError ? result.value.outcome : result.value
        commented.push(...outcome.commented)
        created.push(...outcome.created)
        deferred.push(...outcome.deferred)
        for (const destination of outcome.unlabelled)
          if (!unlabelled.includes(destination)) unlabelled.push(destination)
        written.push(...outcome.written)
        consumed += outcome.consumed

        if (result.value instanceof publisher.PartialError) {
          const failure = publisher.toFailure({
            message: result.value.message,
            repo: destination,
            ...(result.value.status !== undefined ? { status: result.value.status } : {}),
          })
          for (const entry of result.value.entries)
            deferred.push({
              code: failure.code,
              id: entry.id,
              reason: failure.message,
            })
        }
      }
    }

    // One commit, however many destinations were involved.
    const commit = await attempt(
      (async () => {
        if (c.options.commit === false || c.options.dryRun || written.length === 0) return false
        await Git.add(written, { cwd: root })
        return Git.commit('chore: sync friction log', { cwd: root, files: written })
      })(),
    )
    if (!commit.ok) return c.error({ code: 'COMMIT_FAILED', message: commit.message })

    const position = new Map(publishable.map((entry, index) => [entry.id, index]))
    deferred.sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0))

    return c.ok(
      { commented, committed: commit.value, created, deferred, unlabelled },
      {
        cta: {
          commands: [{ command: 'list', description: 'See what is still pending' }],
          description: 'Next:',
        },
      },
    )
  },
})
