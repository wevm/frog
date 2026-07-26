import fs from 'node:fs/promises'
import path from 'node:path'
import * as cli from '../../../test/cli.js'
import * as helpers from '../../../test/helpers.js'
import * as Config from '../../Config.js'
import * as Store from '../../Store.js'

test('behavior: scaffolds the directory', async () => {
  const cwd = await helpers.repo()

  expect(await cli.data(['init', '--cwd', cwd])).toMatchInlineSnapshot(`
    {
      "created": [
        ".agents/friction-log/README.md",
        ".agents/friction-log/TEMPLATE.md",
        ".agents/friction-log/config.json",
      ],
      "existing": [],
    }
  `)

  // The scaffolded config must validate against the schema it advertises.
  expect(await Config.resolve({ root: cwd })).toEqual(Config.from({}))
})

test('behavior: the template it writes parses as an entry', async () => {
  const cwd = await helpers.repo()
  await cli.data(['init', '--cwd', cwd])

  const template = await fs.readFile(path.join(cwd, Store.dir, 'TEMPLATE.md'), 'utf8')
  await fs.mkdir(path.join(cwd, Store.toDir('from-template')), { recursive: true })
  await fs.writeFile(path.join(cwd, Store.toPath('from-template')), template, 'utf8')

  expect((await Store.get('from-template', { root: cwd })).title).toBe(
    'One line, specific enough to search for',
  )
})

test('behavior: re-running never clobbers local edits', async () => {
  const cwd = await helpers.repo()
  await cli.data(['init', '--cwd', cwd])
  await fs.writeFile(path.join(cwd, Config.file), '{ "maxPerRun": 3 }', 'utf8')

  expect(await cli.data(['init', '--cwd', cwd])).toMatchObject({
    created: [],
    existing: [
      '.agents/friction-log/README.md',
      '.agents/friction-log/TEMPLATE.md',
      '.agents/friction-log/config.json',
    ],
  })
  expect((await Config.resolve({ root: cwd })).maxPerRun).toBe(3)
})
