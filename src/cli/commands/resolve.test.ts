import * as fs from 'node:fs/promises'
import * as cli from '../../../test/cli.js'
import * as helpers from '../../../test/helpers.js'
import * as Store from '../../Store.js'

test('behavior: removes one resolved entry', async () => {
  const cwd = await helpers.repo()
  await Store.write(
    { body: 'The workaround is no longer needed.', severity: 'minor', title: 'Resolved' },
    { id: 'resolved', root: cwd },
  )

  await expect(cli.data(['resolve', 'resolved', '--cwd', cwd])).resolves.toEqual({
    id: 'resolved',
    removed: true,
  })
  await expect(Store.list({ root: cwd })).resolves.toEqual([])
  await expect(cli.data(['resolve', 'resolved', '--cwd', cwd])).resolves.toEqual({
    id: 'resolved',
    removed: false,
  })
})

test('security: rejects path traversal without removing parent directories', async () => {
  const cwd = await helpers.repo()
  await helpers.writeFile('.agents/keep.txt', 'keep', cwd)

  await expect(cli.error(['resolve', '..', '--cwd', cwd])).resolves.toEqual({
    code: 'INVALID_ENTRY_ID',
    message: 'Entry id must be one path-safe directory name.',
  })
  await expect(fs.readFile(`${cwd}/.agents/keep.txt`, 'utf8')).resolves.toBe('keep')
})

test('behavior: passes opaque ids to configured stores', async () => {
  const cwd = await helpers.repo()
  const store = Store.from({
    name: 'custom',
    read: async () => [],
    get: async () => {
      throw new Error('Unexpected get.')
    },
    write: async () => {
      throw new Error('Unexpected write.')
    },
    remove: async (id) => id === 'ticket/123',
  })

  await expect(cli.data(['resolve', 'ticket/123', '--cwd', cwd], {}, { store })).resolves.toEqual({
    id: 'ticket/123',
    removed: true,
  })
})
