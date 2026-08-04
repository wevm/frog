import { tmpdir } from '../test/helpers.js'
import * as Frog from './Frog.js'
import * as Store from './Store.js'

const entry = {
  body: 'It took an unnecessary workaround.',
  severity: 'minor',
  title: 'Filters ignored',
} as const

describe('create', () => {
  test('behavior: returns a plain logger around the supplied store', async () => {
    const store = Store.file({ root: await tmpdir() })
    const frog = Frog.create({ store })
    const result = await frog.log(entry)

    expect(Object.getPrototypeOf(frog)).toBe(Object.prototype)
    expect(result).toMatchObject({ created: true, occurrences: 1 })
    expect(frog.store).toBe(store)
    expect(await frog.logs()).toEqual([{ entry: result.entry, occurrences: 1 }])
  })

  test('behavior: deduplicates normalized titles for stores without atomic logging', async () => {
    const frog = Frog.create({ store: Store.file({ root: await tmpdir() }) })
    const first = await frog.log(entry)
    const repeated = await frog.log({ ...entry, title: 'filters: ignored!' })

    expect(repeated).toEqual({
      created: false,
      entry: first.entry,
      location: first.location,
      occurrences: 1,
    })
    expect(await frog.logs()).toHaveLength(1)
  })

  test('behavior: delegates atomic logging to a store that provides it', async () => {
    const log = vi.fn(async () => ({
      created: false,
      entry: { ...entry, id: 'existing' },
      location: 'custom:existing',
      occurrences: 4,
    }))
    const store = Store.from({
      name: 'custom',
      log,
      read: vi.fn(),
      get: vi.fn(),
      write: vi.fn(),
      remove: vi.fn(),
    })
    const frog = Frog.create({ store })

    await expect(frog.log(entry)).resolves.toMatchObject({ created: false, occurrences: 4 })
    expect(log).toHaveBeenCalledWith(entry, {})
  })
})
