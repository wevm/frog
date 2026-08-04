import * as cli from '../../../test/cli.js'
import * as Store from '../../Store.js'

test('behavior: the file store reports that it needs no migration', async () => {
  await expect(cli.data(['migrate'])).resolves.toEqual({ migrated: false, store: 'file' })
})

test('behavior: delegates migration to the selected store', async () => {
  let calls = 0
  const adapter: Store.Adapter = {
    name: 'test',
    migrate: async () => {
      calls++
    },
    read: async () => [],
    list: async () => [],
    get: async () => {
      throw new Error('unused')
    },
    write: async () => ({ id: 'unused', location: 'unused' }),
    remove: async () => false,
    files: async () => [],
  }

  await Store.withAdapter(adapter, async () => {
    await expect(cli.data(['migrate'])).resolves.toEqual({ migrated: true, store: 'test' })
  })
  expect(calls).toBe(1)
})
