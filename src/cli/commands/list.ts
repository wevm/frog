import { Cli, z } from 'incur'
import * as Git from '../../Git.js'
import * as Store from '../../Store.js'
import { attempt } from '../internal/attempt.js'
import * as context from '../internal/context.js'

/** Local state of an entry. Remote issue state arrives with `sync`. */
const State = z.enum(['linked', 'pending'])

export const list = Cli.create('list', {
  description: 'List recorded friction.',
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
        id: z.string(),
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

    // Both `c.error` calls stay at the top level of `run`. See `internal/attempt.ts` for why.
    const entries = await attempt(Store.read({ root }))
    if (!entries.ok)
      return c.error({
        code: entries.code,
        message: entries.message,
        cta: {
          commands: [{ command: 'init', description: 'Recreate the template to compare against' }],
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

    const listed = entries.value
      .filter((entry) => !ids || ids.has(entry.id))
      .map((entry) => ({
        id: entry.id,
        severity: entry.severity,
        state: entry.issue ? ('linked' as const) : ('pending' as const),
        title: entry.title,
        ...(entry.issue ? { issue: entry.issue } : {}),
        ...(entry.target ? { target: entry.target } : {}),
      }))
      .filter((entry) => !c.options.state || entry.state === c.options.state)

    return {
      entries: listed,
      linked: listed.filter((entry) => entry.state === 'linked').length,
      pending: listed.filter((entry) => entry.state === 'pending').length,
    }
  },
})
