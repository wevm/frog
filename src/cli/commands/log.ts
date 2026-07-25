import * as clack from '@clack/prompts'
import { Cli, z } from 'incur'
import * as Frictionset from '../../Frictionset.js'
import * as Store from '../../Store.js'
import { attempt } from '../internal/attempt.js'
import * as context from '../internal/context.js'
import * as prompt from '../internal/prompt.js'
import * as publisher from '../internal/publish.js'

async function promptTitle(): Promise<string> {
  const value = prompt.required(
    await clack.text({
      ...prompt.stream,
      message: 'What was the friction?',
      placeholder: '`pnpm test -- <files>` ignores file filters',
      validate: (value) => (value?.trim() ? undefined : 'A title is required.'),
    }),
  )
  return value.trim()
}

async function promptSeverity(): Promise<Frictionset.Severity> {
  return prompt.required(
    await clack.select({
      ...prompt.stream,
      message: 'How much did it hurt?',
      initialValue: 'minor' as Frictionset.Severity,
      options: [
        { hint: 'could not proceed', label: 'blocker', value: 'blocker' },
        { hint: 'lost real time', label: 'major', value: 'major' },
        { hint: 'a papercut', label: 'minor', value: 'minor' },
      ],
    }),
  )
}

export const log = Cli.create('log', {
  description: 'Record a friction you just hit.',
  args: z.object({
    title: z.string().min(1).optional().describe('One line, specific enough to search for.'),
  }),
  env: z.object({
    EDITOR: z
      .string()
      .optional()
      .describe('Editor opened for the body when running interactively.'),
    GH_TOKEN: z.string().optional().describe('Fallback when GITHUB_TOKEN is unset.'),
    GITHUB_API_URL: z.string().optional().describe('API base URL. Set for you inside Actions.'),
    GITHUB_TOKEN: z.string().optional().describe('Token used by --publish.'),
    VISUAL: z.string().optional().describe('Preferred over EDITOR when both are set.'),
  }),
  options: z.object({
    body: z
      .string()
      .optional()
      .describe('Markdown body. Required unless running interactively, where an editor opens.'),
    cwd: context.cwdOption,
    force: z.boolean().optional().describe('Log it even if a similar entry already exists.'),
    label: z.array(z.string().min(1)).optional().describe('Extra issue label. Repeatable.'),
    open: z.boolean().optional().describe('Open $EDITOR on the entry after writing it.'),
    publish: z
      .boolean()
      .optional()
      .describe('File the issue immediately. Defaults to the `publishOnLog` config value.'),
    severity: Frictionset.Severity.optional().describe('Impact. Defaults to minor.'),
    token: z.string().min(1).optional().describe('GitHub token. Overrides the environment.'),
    target: z
      .string()
      .min(1)
      .optional()
      .describe('Upstream package, `owner/repo`, or host. Omit for this repository.'),
  }),
  alias: { body: 'b', severity: 's', target: 't' },
  examples: [
    {
      args: { title: '`pnpm test -- <files>` ignores file filters' },
      description: 'Log friction in this repository',
      options: { body: '## Description\n\nThe filter was swallowed.' },
    },
    {
      args: { title: '`getBalance` rejects a checksummed address' },
      description: 'Log friction in an upstream library',
      options: { severity: 'major', target: 'viem' },
    },
  ],
  hint: 'Run `frictionsets list` first: the entry you are about to write may already exist.',
  output: z.object({
    file: z.string().describe('Path of the entry, relative to the repository root.'),
    id: z.string(),
    issue: z.string().optional().describe('Linked issue, when --publish filed one.'),
    title: z.string(),
    unfiled: z
      .string()
      .optional()
      .describe('Why --publish did not file an issue. The entry is written either way.'),
  }),
  async run(c) {
    const { config, repo, root } = await context.resolve({ cwd: c.options.cwd })
    const interactive = prompt.interactive()

    // Every `c.error` below is returned straight from `run`. See `internal/attempt.ts` for why that
    // matters.
    const prompted = !c.args.title && interactive ? await attempt(promptTitle()) : undefined
    if (prompted && !prompted.ok) return c.error({ code: prompted.code, message: prompted.message })

    const title = c.args.title ?? (prompted?.ok ? prompted.value : undefined)
    if (!title)
      return c.error({
        code: 'MISSING_TITLE',
        message: 'A title is required.',
        cta: {
          commands: [{ command: 'log', description: 'Pass the title as the first argument' }],
          description: 'Try:',
        },
      })

    if (!c.options.body && !interactive)
      return c.error({
        code: 'MISSING_BODY',
        message: 'A body is required. An entry with no detail is not actionable.',
        cta: {
          commands: [{ command: 'log', description: 'Pass --body with the markdown detail' }],
          description: 'Try:',
        },
      })

    const entries = await attempt(Store.read({ root }))
    if (!entries.ok) return c.error({ code: entries.code, message: entries.message })

    // Catching the repeat here, at authoring time, is the only place it is cheap. A flat friction
    // log has no duplicate check at all, which is how the same item lands five times.
    const duplicate = entries.value.find(
      (entry) => Frictionset.normalizeTitle(entry.title) === Frictionset.normalizeTitle(title),
    )
    if (duplicate && !c.options.force)
      return c.error({
        code: 'DUPLICATE_FRICTION',
        message: `\`${duplicate.id}\` already records this${duplicate.issue ? ` as ${duplicate.issue}` : ''}.`,
        cta: {
          commands: [{ command: 'list', description: 'Review what is already recorded' }],
          description: 'Add detail to the existing entry, or:',
        },
      })

    const promptedSeverity =
      !c.options.severity && interactive ? await attempt(promptSeverity()) : undefined
    if (promptedSeverity && !promptedSeverity.ok)
      return c.error({ code: promptedSeverity.code, message: promptedSeverity.message })

    const severity = c.options.severity ?? (promptedSeverity?.ok ? promptedSeverity.value : 'minor')

    const { file, id } = await Store.write(
      {
        body: c.options.body ?? Frictionset.template,
        severity,
        title,
        ...(c.options.label?.length ? { labels: c.options.label } : {}),
        ...(c.options.target ? { target: c.options.target } : {}),
      },
      { root },
    )

    // Only reached interactively, or on request: the editor is the long-form input path.
    if (c.options.open ?? (interactive && !c.options.body)) {
      const edited = await attempt(
        prompt
          .edit(`${root}/${file}`, { command: c.env.VISUAL ?? c.env.EDITOR ?? 'vi' })
          // Re-read so a body broken in the editor fails here rather than at publish time.
          .then(() => Store.get(id, { root })),
      )
      if (!edited.ok) return c.error({ code: edited.code, message: edited.message })
    }

    if (!(c.options.publish ?? config.publishOnLog))
      return c.ok(
        { file, id, title },
        {
          cta: {
            commands: [
              { command: 'list', description: 'See everything recorded' },
              { command: 'publish', description: 'File it as an issue now' },
            ],
            description: 'Next:',
          },
        },
      )

    // Filing must never lose the entry. It is already on disk, so every failure past this point
    // reports why it stayed pending rather than failing the command.
    const filed = await attempt(
      (async () => {
        const ready = await publisher.prepare({
          config,
          env: c.env,
          repo,
          ...(c.options.token ? { token: c.options.token } : {}),
        })
        if ('code' in ready) return ready
        // `commit: false`: the entry belongs in the same commit as the work that provoked it.
        const outcome = await publisher.file({
          ...ready,
          commit: false,
          config,
          entries: [await Store.get(id, { root })],
          root,
        })
        return (
          outcome.created[0] ??
          outcome.commented[0] ?? { code: 'PUBLISH_FAILED', message: 'Nothing was filed.' }
        )
      })(),
    )

    const unfiled = !filed.ok
      ? filed.message
      : 'code' in filed.value
        ? filed.value.message
        : undefined

    return c.ok(
      {
        file,
        id,
        title,
        ...(filed.ok && 'issue' in filed.value ? { issue: filed.value.issue } : {}),
        ...(unfiled ? { unfiled } : {}),
      },
      {
        cta: {
          commands: unfiled
            ? [{ command: 'publish', description: 'File it once the problem above is fixed' }]
            : [{ command: 'list', description: 'See everything recorded' }],
          description: 'Next:',
        },
      },
    )
  },
})
