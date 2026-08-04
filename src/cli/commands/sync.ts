import fs from 'node:fs/promises'
import path from 'node:path'
import { Cli, z } from 'incur'
import * as AppSync from '../../AppSync.js'
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
      .describe('Commit the changes. On by default; pass `--no-commit` to leave them staged.'),
    cwd: context.cwdOption,
    dryRun: z.boolean().optional().describe('Report what would change without changing it.'),
    expectedAuthor: z
      .string()
      .min(1)
      .optional()
      .describe('Issue author trusted by automated reconciliation.'),
    state: z
      .string()
      .min(1)
      .optional()
      .describe('Content-free reconciliation state from the Frog GitHub App.'),
    token: z.string().min(1).optional().describe('GitHub token. Overrides the environment.'),
  }),
  alias: { dryRun: 'n' },
  examples: [
    { description: 'Reconcile against issue state' },
    { description: 'See what would change', options: { dryRun: true } },
  ],
  hint: 'Safe to run repeatedly. Issue state takes precedence.',
  output: z.object({
    cleared: z
      .array(z.object({ id: z.string(), title: z.string() }))
      .describe('Entries whose issue is gone. Their link was removed and they are pending again.'),
    committed: z.boolean(),
    deferred: z
      .array(z.object({ code: z.string(), id: z.string(), reason: z.string() }))
      .describe('Entries left unreconciled, and why.'),
    reopened: z
      .array(z.object({ id: z.string(), title: z.string() }))
      .describe('Entries rebuilt after their issues reopened.'),
    removed: z
      .array(z.object({ id: z.string(), title: z.string() }))
      .describe('Entries whose issue closed. The friction is resolved.'),
    updated: z
      .array(z.object({ id: z.string(), title: z.string() }))
      .describe('Entries rewritten from their issue, or rebuilt.'),
  }),
  async run(c) {
    const { config, repo, root } = await context.resolve({ cwd: c.options.cwd })

    const entries = await attempt(Store.read({ root }))
    if (!entries.ok) return c.error({ code: entries.code, message: entries.message })
    const mirrors = await attempt(Mirrors.resolve({ root }))
    if (!mirrors.ok) return c.error({ code: mirrors.code, message: mirrors.message })

    if (
      Store.activeName() === 'file' &&
      c.options.commit !== false &&
      !c.options.dryRun &&
      !(await Git.identity({ cwd: root }))
    )
      return c.error({
        code: 'NO_GIT_IDENTITY',
        message:
          'Configure both `user.name` and `user.email` before Frog commits reconciled entries.',
      })

    if (c.options.state) {
      const loaded = await attempt(
        fs
          .readFile(path.resolve(c.options.state), 'utf8')
          .then((contents) => AppSync.from(JSON.parse(contents))),
      )
      if (!loaded.ok) return c.error({ code: loaded.code, message: loaded.message })

      const snapshot = loaded.value
      const head = await Git.head({ cwd: root })
      if (snapshot.repository.fullName !== repo || snapshot.repository.sha !== head)
        return c.error({
          code: 'APP_STATE_MISMATCH',
          message: 'App reconciliation state does not describe this repository checkout.',
        })
      if (!snapshot.complete) {
        const legacy = new Set(
          mirrors.value.mirrors.flatMap((mirror) => {
            if (
              mirror.occurrence !== undefined ||
              snapshot.reports[AppSync.legacyOccurrence(mirror.issue)]?.state !== 'open'
            )
              return []
            const id = Store.toId(mirror.path)
            return id ? [id] : []
          }),
        )
        const ids = [
          ...new Set([
            ...entries.value.map((entry) => entry.id),
            ...mirrors.value.mirrors
              .map((mirror) => Store.toId(mirror.path))
              .filter((id): id is string => id !== undefined),
          ]),
        ]
        if (ids.length === 0)
          return c.error({
            code: 'APP_STATE_INCOMPLETE',
            message: 'The Frog App could not inspect every report. No changes were applied.',
          })
        return c.ok({
          cleared: [],
          committed: false,
          deferred: ids.map((id) =>
            legacy.has(id)
              ? {
                  code: 'APP_LEGACY_MIRROR',
                  id,
                  reason:
                    'This report predates repository-owned recovery snapshots. Recreate it manually from its issue.',
                }
              : {
                  code: 'APP_STATE_INCOMPLETE',
                  id,
                  reason: 'The Frog App could not inspect every report.',
                },
          ),
          removed: [],
          reopened: [],
          updated: [],
        })
      }

      const planned = await attempt(
        Promise.resolve(
          AppSync.plan(snapshot, {
            entries: entries.value,
            mirrors: mirrors.value.mirrors,
          }),
        ),
      )
      if (!planned.ok) return c.error({ code: planned.code, message: planned.message })

      const plan = planned.value
      const byId = new Map(entries.value.map((entry) => [entry.id, entry]))
      const cleared = plan.clearLink.map((entry) => ({ id: entry.id, title: entry.title }))
      const removed = plan.remove.flatMap((id) => {
        const entry = byId.get(id)
        return entry ? [{ id, title: entry.title }] : []
      })
      const reopened = plan.write
        .filter((entry) => !byId.has(entry.id))
        .map((entry) => ({ id: entry.id, title: entry.title }))
      const updated = plan.write.map((entry) => ({ id: entry.id, title: entry.title }))
      const nextMirrors = Mirrors.update(mirrors.value, {
        forget: plan.forget,
        remember: plan.remember,
      })
      const mirrorsChanged = Mirrors.serialize(nextMirrors) !== Mirrors.serialize(mirrors.value)

      if (c.options.dryRun || (AppSync.empty(plan) && !mirrorsChanged))
        return c.ok({
          cleared,
          committed: false,
          deferred: [],
          removed,
          reopened,
          updated,
        })

      if (Store.activeName() === 'file')
        await Git.rm(plan.remove.map(Store.toDir), { cwd: root, ignoreUnmatch: true })
      for (const id of plan.remove) await Store.remove(id, { root })
      for (const entry of [...plan.write, ...plan.clearLink])
        await Store.write(entry, { id: entry.id, root })
      if (mirrorsChanged) await Mirrors.write(nextMirrors, { root })

      const touched = [...plan.write, ...plan.clearLink].map((entry) => Store.toPath(entry.id))
      if (mirrorsChanged) touched.push(Mirrors.file)
      const commit = await attempt(
        (async () => {
          if (Store.activeName() !== 'file' || c.options.commit === false) return false
          await Git.add(touched, { cwd: root })
          return Git.commit('chore: sync friction log', {
            cwd: root,
            files: [...plan.remove.map(Store.toDir), ...touched],
          })
        })(),
      )
      if (!commit.ok) return c.error({ code: 'COMMIT_FAILED', message: commit.message })

      return c.ok(
        {
          cleared,
          committed: commit.value,
          deferred: [],
          removed,
          reopened,
          updated,
        },
        {
          cta: {
            commands: [{ command: 'list', description: 'See what is left' }],
            description: 'Next:',
          },
        },
      )
    }

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

    // Check every repository these entries point at, not just this one. An entry reported upstream is
    // mirrored here, so its issue closing has to be noticed here too. Always include the own
    // repository: a reopened issue whose file was deleted has nothing local to notice it by.
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
    const deferred: { code: string; id: string; reason: string }[] = []
    const forget: Mirrors.Mirror[] = []
    for (const destination of destinations) {
      const remembered = mirrors.value.mirrors.filter(
        (mirror) => Github.parseLink(mirror.issue)?.repo === destination,
      )
      const issues = await attempt(
        Sync.state({
          entries: entries.value,
          get: async (issue) => {
            const value = await Github.get(ready.client, { issue, repo: destination })
            return !c.options.expectedAuthor || value?.author === c.options.expectedAuthor
              ? value
              : undefined
          },
          list: async () => {
            const values = await Github.list(ready.client, {
              label: ready.label,
              repo: destination,
            })
            return c.options.expectedAuthor
              ? values.filter((issue) => issue.author === c.options.expectedAuthor)
              : values
          },
          remembered: remembered
            .map((mirror) => Github.parseLink(mirror.issue)?.issue)
            .filter((issue): issue is number => issue !== undefined),
          repo: destination,
        }),
      )
      if (!issues.ok) {
        const failure = publisher.toFailure({
          message: issues.message,
          repo: destination,
          ...(issues.status !== undefined ? { status: issues.status } : {}),
        })
        const ids = new Set([
          ...entries.value
            .filter(
              (entry) =>
                entry.issue !== undefined && Github.parseLink(entry.issue)?.repo === destination,
            )
            .map((entry) => entry.id),
          ...remembered
            .map((mirror) => Store.toId(mirror.path))
            .filter((id): id is string => id !== undefined),
        ])
        for (const id of ids)
          deferred.push({
            code: failure.code,
            id,
            reason: failure.message,
          })
        continue
      }

      plans.push(
        Sync.plan({
          entries: entries.value,
          issues: issues.value,
          labels: config.labels,
          mirrors: remembered,
          // The files are always here, whichever repository the issues are in.
          origin: ready.repo,
          repo: destination,
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

    const byId = new Map(entries.value.map((entry) => [entry.id, entry]))
    const cleared = plan.clearLink.map((entry) => ({ id: entry.id, title: entry.title }))
    const removedIds = [...new Set(plan.remove)]
    const removed = removedIds.flatMap((id) => {
      const entry = byId.get(id)
      return entry ? [{ id, title: entry.title }] : []
    })
    const reopened = plan.write
      .filter((entry) => !byId.has(entry.id))
      .map((entry) => ({ id: entry.id, title: entry.title }))
    const updated = plan.write.map((entry) => ({ id: entry.id, title: entry.title }))

    const remember: Mirrors.Mirror[] = []
    for (const id of removedIds) {
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
      return c.ok({ cleared, committed: false, deferred, removed, reopened, updated })

    // Stage before unlinking so tracked entries have their deletion recorded. The whole directory
    // goes, artifacts included. `ignoreUnmatch` covers entries that were never committed; those are
    // removed from disk below.
    if (Store.activeName() === 'file')
      await Git.rm(removedIds.map(Store.toDir), { cwd: root, ignoreUnmatch: true })
    for (const id of removedIds) await Store.remove(id, { root })

    for (const entry of [...plan.write, ...plan.clearLink])
      await Store.write(entry, { id: entry.id, root })
    if (mirrorsChanged) await Mirrors.write(nextMirrors, { root })

    const touched = [...plan.write, ...plan.clearLink].map((entry) => Store.toPath(entry.id))
    if (mirrorsChanged) touched.push(Mirrors.file)
    const commit = await attempt(
      (async () => {
        if (Store.activeName() !== 'file' || c.options.commit === false) return false
        await Git.add(touched, { cwd: root })
        return Git.commit('chore: sync friction log', {
          cwd: root,
          files: [...removedIds.map(Store.toDir), ...touched],
        })
      })(),
    )
    if (!commit.ok) return c.error({ code: 'COMMIT_FAILED', message: commit.message })

    return c.ok(
      { cleared, committed: commit.value, deferred, removed, reopened, updated },
      {
        cta: {
          commands: [{ command: 'list', description: 'See what is left' }],
          description: 'Next:',
        },
      },
    )
  },
})
