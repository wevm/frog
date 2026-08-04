import { Cli, z } from 'incur'
import * as Git from '../../Git.js'
import * as Store from '../../Store.js'
import { attempt } from '../internal/attempt.js'
import * as context from '../internal/context.js'

/** Local state of an entry. Remote issue state arrives with `sync`. */
const State = z.enum(['linked', 'pending'])

export const list = Cli.create('list', {
  description: 'List entries with their state.',
  options: z.object({
    cwd: context.cwdOption,
    since: z.string().min(1).optional().describe('Only entries added since this git ref.'),
    state: State.optional().describe('Filter by state.'),
  }),
  alias: { since: 'S' },
  examples: [
    { description: 'Everything recorded' },
    { description: 'Only what is not filed yet', options: { state: 'pending' } },
    { description: 'Only what this branch added', options: { since: 'main' } },
  ],
  output: z.object({
    entries: z.array(
      z.object({
        artifacts: z
          .array(z.string())
          .optional()
          .describe('Reproduction files, when the entry has any. Runnable as they are.'),
        id: z.string(),
        occurrences: z
          .number()
          .int()
          .positive()
          .optional()
          .describe('Times observed, when tracked.'),
        issue: z.string().optional().describe('Linked issue, absent while pending.'),
        severity: z.string(),
        state: State,
        target: z.string().optional().describe('Absent means this repository.'),
        title: z.string(),
      }),
    ),
    linked: z.number().describe('Entries already filed as issues.'),
    pending: z.number().describe('Entries not filed yet.'),
  }),
  async run(c) {
    const { root } = await context.resolve({ cwd: c.options.cwd })

    if (c.options.since && Store.activeName() !== 'file')
      return c.error({
        code: 'STORE_UNSUPPORTED_OPTION',
        message: '`--since` is available only with the repository file store.',
      })

    // Both `c.error` calls stay at the top level of `run`. See `internal/attempt.ts` for why.
    const records = await attempt(Store.records({ root }))
    if (!records.ok)
      return c.error({
        code: records.code,
        message: records.message,
        cta: {
          commands: [{ command: 'list', description: 'Check that every entry parses' }],
          description: 'Fix the file, then:',
        },
      })

    const changed = c.options.since
      ? await attempt(Git.changedSince(c.options.since, Store.dir, { cwd: root }))
      : undefined
    if (changed && !changed.ok)
      return c.error({
        code: 'UNKNOWN_REF',
        message: `\`${c.options.since}\` is not a ref in this repository.`,
      })

    const ids = changed?.ok
      ? new Set(changed.value.map(Store.toId).filter((id): id is string => Boolean(id)))
      : undefined

    const occurrences = new Map(
      records.value.map((record) => [record.entry.id, record.occurrences] as const),
    )
    const selected = records.value
      .map((record) => record.entry)
      .filter((entry) => !ids || ids.has(entry.id))
      .filter(
        (entry) => !c.options.state || (entry.issue ? 'linked' : 'pending') === c.options.state,
      )

    const listed = await Promise.all(
      selected.map(async (entry) => {
        const files = await Store.files(entry.id, { root })
        const artifacts = files.filter((file) => file.startsWith(`${Store.toArtifacts(entry.id)}/`))
        return {
          id: entry.id,
          ...(Store.activeName() === 'file' ? {} : { occurrences: occurrences.get(entry.id) ?? 1 }),
          severity: entry.severity,
          state: entry.issue ? ('linked' as const) : ('pending' as const),
          title: entry.title,
          ...(artifacts.length ? { artifacts } : {}),
          ...(entry.issue ? { issue: entry.issue } : {}),
          ...(entry.target ? { target: entry.target } : {}),
        }
      }),
    )

    return {
      entries: listed,
      linked: listed.filter((entry) => entry.state === 'linked').length,
      pending: listed.filter((entry) => entry.state === 'pending').length,
    }
  },
})
