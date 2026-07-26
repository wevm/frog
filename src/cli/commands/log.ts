import * as clack from '@clack/prompts'
import { Cli, z } from 'incur'
import * as Entry from '../../Entry.js'
import * as Store from '../../Store.js'
import * as Target from '../../Target.js'
import { attempt } from '../internal/attempt.js'
import * as context from '../internal/context.js'
import * as form from '../internal/form.js'
import * as prompt from '../internal/prompt.js'
import * as publisher from '../internal/publish.js'
import * as stdin from '../internal/stdin.js'
import * as target from '../internal/target.js'

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

async function promptSeverity(): Promise<Entry.Severity> {
  return prompt.required(
    await clack.select({
      ...prompt.stream,
      message: 'How much did it hurt?',
      initialValue: 'minor' as Entry.Severity,
      options: [
        { hint: 'could not proceed', label: 'blocker', value: 'blocker' },
        { hint: 'lost real time', label: 'major', value: 'major' },
        { hint: 'a papercut', label: 'minor', value: 'minor' },
      ],
    }),
  )
}

export const log = Cli.create('log', {
  description: 'Write a friction entry.',
  args: z.object({
    title: z.string().min(1).optional().describe('One line, specific enough to search for.'),
  }),
  env: z.object({
    EDITOR: z
      .string()
      .optional()
      .describe('Editor opened for the body when running interactively.'),
    GH_TOKEN: z.string().optional().describe('Fallback when GITHUB_TOKEN is unset.'),
    GITHUB_API_URL: z
      .string()
      .optional()
      .describe('API base URL. Set automatically inside Actions.'),
    GITHUB_TOKEN: z.string().optional().describe('Token used by --publish.'),
    VISUAL: z.string().optional().describe('Preferred over EDITOR when both are set.'),
  }),
  options: z.object({
    body: z
      .string()
      .optional()
      .describe('Markdown body. Also readable from piped input, or an editor when interactive.'),
    cwd: context.cwdOption,
    force: z.boolean().optional().describe('Log it even if a similar entry already exists.'),
    label: z.array(z.string().min(1)).optional().describe('Extra issue label. Repeatable.'),
    open: z.boolean().optional().describe('Open $EDITOR on the entry after writing it.'),
    publish: z
      .boolean()
      .optional()
      .describe('File the issue immediately. Defaults to the `publishOnLog` config value.'),
    severity: Entry.Severity.optional().describe('Impact. Defaults to minor.'),
    token: z.string().min(1).optional().describe('GitHub token. Overrides the environment.'),
    target: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Upstream npm package or GitHub repository as `owner/repo`. Omit for this repository.',
      ),
  }),
  alias: { body: 'b', severity: 's', target: 't' },
  usage: [{}, { args: { title: true }, options: { body: true } }, { prefix: 'cat entry.md |' }],
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
  hint: 'Run `frog list` first: this friction may already be recorded.',
  output: z.object({
    artifacts: z
      .string()
      .describe('Directory for reproduction files. Not created until something writes there.'),
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

    // Piped input is the whole entry, shaped like a commit message. It is what makes bare `frog log`
    // usable without a terminal, where a prompt cannot run at all.
    //
    // Not read at all once the arguments cover both parts. Standard input is whatever the caller left
    // attached, and looking at it when there is nothing to learn only costs the wait.
    const piped = c.args.title && c.options.body ? undefined : await attempt(stdin.read())
    if (piped && !piped.ok) return c.error({ code: piped.code, message: piped.message })
    const input = piped?.ok && piped.value ? stdin.parse(piped.value) : undefined

    // Every `c.error` below is returned straight from `run`. See `internal/attempt.ts` for why that
    // matters.
    const needsTitle = !c.args.title && !input
    const prompted = needsTitle && interactive ? await attempt(promptTitle()) : undefined
    if (prompted && !prompted.ok) return c.error({ code: prompted.code, message: prompted.message })

    const title = c.args.title ?? input?.title ?? (prompted?.ok ? prompted.value : undefined)
    if (!title)
      return c.error({
        code: 'MISSING_TITLE',
        message: 'A title is required.',
        cta: {
          commands: [{ command: 'log', description: 'Pipe the entry in, or pass a title' }],
          description: 'Try:',
        },
      })

    const body = c.options.body ?? (input?.body || undefined)

    // An upstream project judges a report against its own issue form, so scaffold from that rather than
    // from frog's sections. Fetched only when the answers would be used, and never fatal: a target that
    // cannot be reached costs the scaffold, not the entry.
    const upstream =
      !body && c.options.target
        ? await attempt(
            form.scaffold(c.options.target, {
              allowedRepos: config.outbound.allowedRepos,
              env: c.env,
              root,
              self: repo,
              ...(c.options.token ? { token: c.options.token } : {}),
            }),
          )
        : undefined
    const scaffold = upstream?.ok ? upstream.value : undefined

    // A scaffold is the detail this is asking for, one question at a time, so it satisfies the guard.
    // Without a terminal there is otherwise no way to reach a template at all, which would leave the
    // upstream's questions unreachable by the agents this exists for.
    if (!body && !scaffold && !interactive)
      return c.error({
        code: 'MISSING_BODY',
        message: 'A body is required. An entry with no detail is not actionable.',
        cta: {
          commands: [
            { command: 'log', description: 'Pipe a title, a blank line, then the detail' },
          ],
          description: 'Try:',
        },
      })

    const entries = await attempt(Store.read({ root }))
    if (!entries.ok) return c.error({ code: entries.code, message: entries.message })

    // Catching the repeat here, at authoring time, is the only place it is cheap. A flat friction
    // log has no duplicate check at all, which is how the same item lands five times.
    const duplicate = entries.value.find(
      (entry) => Entry.normalizeTitle(entry.title) === Entry.normalizeTitle(title),
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
        body: body ?? scaffold ?? Entry.template,
        severity,
        title,
        ...(c.options.label?.length ? { labels: c.options.label } : {}),
        ...(c.options.target ? { target: c.options.target } : {}),
      },
      { root },
    )

    // Only reached interactively, or on request: the editor is the long-form input path.
    if (c.options.open ?? (interactive && !body)) {
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
        { artifacts: Store.toArtifacts(id), file, id, title },
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

        const entry = await Store.get(id, { root })
        const resolution = await Target.resolve(
          entry.target,
          target.resolvers({
            allowedRepos: config.outbound.allowedRepos,
            client: ready.client,
            root,
            self: ready.repo,
          }),
        )
        if (!resolution.ok) return { code: resolution.code, message: resolution.message }

        // Nothing is committed: the entry belongs in the same commit as the work that provoked it.
        const outcome = await publisher.file({
          ...ready,
          config,
          entries: [entry],
          origin: ready.repo,
          repo: resolution.target.repo,
          root,
          ...(resolution.target.labels ? { labels: resolution.target.labels } : {}),
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
        artifacts: Store.toArtifacts(id),
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
