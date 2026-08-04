import * as cli from '../../../test/cli.js'
import * as helpers from '../../../test/helpers.js'
import { FakePostgresClient } from '../../../test/postgres.js'
import { FrictionLog } from '../../FrictionLog.js'
import * as PostgresStore from '../../PostgresStore.js'
import * as Store from '../../Store.js'

const body = 'The filter was swallowed.'

async function seed(cwd: string): Promise<void> {
  await Store.write({ body, severity: 'blocker', title: 'Filters ignored' }, { id: 'a', root: cwd })
  await Store.write(
    { body, issue: 'wevm/viem#4821', severity: 'minor', target: 'viem', title: 'Slow install' },
    { id: 'b', root: cwd },
  )
}

test('behavior: reports which entries ship a reproduction', async () => {
  const cwd = await helpers.repo()
  await seed(cwd)
  await helpers.writeFile(`${Store.toArtifacts('a')}/repro.ts`, 'export {}\n', cwd)

  const result = await cli.data<{ entries: { artifacts?: string[]; id: string }[] }>([
    'list',
    '--cwd',
    cwd,
  ])

  expect(result.entries.map((entry) => [entry.id, entry.artifacts])).toMatchInlineSnapshot(`
    [
      [
        "a",
        [
          ".agents/friction-log/a/artifacts/repro.ts",
        ],
      ],
      [
        "b",
        undefined,
      ],
    ]
  `)
})

test('behavior: lists entries with local state', async () => {
  const cwd = await helpers.repo()
  await seed(cwd)

  expect(await cli.data(['list', '--cwd', cwd])).toMatchInlineSnapshot(`
    {
      "entries": [
        {
          "id": "a",
          "severity": "blocker",
          "state": "pending",
          "title": "Filters ignored",
        },
        {
          "id": "b",
          "issue": "wevm/viem#4821",
          "severity": "minor",
          "state": "linked",
          "target": "viem",
          "title": "Slow install",
        },
      ],
      "linked": 1,
      "pending": 1,
    }
  `)
})

test('behavior: an empty directory lists nothing', async () => {
  expect(await cli.data(['list', '--cwd', await helpers.repo()])).toMatchObject({
    entries: [],
    linked: 0,
    pending: 0,
  })
})

test('behavior: a durable store lists occurrence counts', async () => {
  const store = PostgresStore.adapter({
    client: new FakePostgresClient(),
    namespace: 'list-test',
  })
  const log = new FrictionLog({ store })
  await log.record({ body, severity: 'minor', title: 'Repeated friction' })
  await log.record({ body, severity: 'minor', title: 'repeated friction' })

  await Store.withAdapter(store, async () => {
    expect(await cli.data(['list', '--cwd', await helpers.repo()])).toMatchObject({
      entries: [{ occurrences: 2, title: 'Repeated friction' }],
    })
  })
})

test('behavior: filters by state', async () => {
  const cwd = await helpers.repo()
  await seed(cwd)

  expect(await cli.data(['list', '--state', 'pending', '--cwd', cwd])).toMatchObject({
    entries: [{ id: 'a' }],
    linked: 0,
    pending: 1,
  })
})

test('behavior: filters by ref', async () => {
  const cwd = await helpers.repo()
  await helpers.writeFile('a.txt', 'a', cwd)
  await helpers.commit('add a', cwd)

  await Store.write({ body, severity: 'minor', title: 'On main' }, { id: 'a', root: cwd })
  const base = await helpers.commit('log a', cwd)

  await Store.write({ body, severity: 'minor', title: 'On branch' }, { id: 'b', root: cwd })
  await helpers.commit('log b', cwd)

  expect(await cli.data(['list', '--since', base, '--cwd', cwd])).toMatchObject({
    entries: [{ id: 'b' }],
  })
})

test('error: a malformed entry fails the whole listing', async () => {
  const cwd = await helpers.repo()
  await helpers.writeFile(Store.toPath('broken'), '# no frontmatter\n', cwd)

  expect(await cli.error(['list', '--cwd', cwd])).toMatchInlineSnapshot(`
    {
      "code": "MALFORMED_ENTRY",
      "message": "Entry \`broken\` has no valid YAML frontmatter block.",
    }
  `)
})

test('error: an unknown ref is reported as such', async () => {
  const cwd = await helpers.repo()
  await seed(cwd)

  expect((await cli.error(['list', '--since', 'nope', '--cwd', cwd])).code).toBe('UNKNOWN_REF')
})
