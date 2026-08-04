import { tmpdir } from '../test/helpers.js'
import { FrictionLog } from './FrictionLog.js'

const entry = {
  body: 'It took an unnecessary workaround.',
  severity: 'minor',
  title: 'Filters ignored',
} as const

describe('FrictionLog', () => {
  test('behavior: defaults to the existing repository-file store', async () => {
    const log = new FrictionLog({ root: await tmpdir() })
    const result = await log.record(entry)

    expect(result).toMatchObject({ created: true, occurrences: 1 })
    expect(log.store.name).toBe('file')
    expect(await log.list()).toEqual([result.entry])
    expect(await log.records()).toEqual([{ entry: result.entry, occurrences: 1 }])
  })

  test('behavior: deduplicates normalized titles without changing the file-store default', async () => {
    const log = new FrictionLog({ root: await tmpdir() })
    const first = await log.record(entry)
    const repeated = await log.record({ ...entry, title: 'filters: ignored!' })

    expect(repeated).toEqual({ created: false, entry: first.entry, occurrences: 1 })
    expect(await log.list()).toHaveLength(1)
  })

  test('behavior: delegates atomic recording to an adapter that provides it', async () => {
    const record = vi.fn(async () => ({
      created: false,
      entry: { ...entry, id: 'existing' },
      occurrences: 4,
    }))
    const log = new FrictionLog({
      store: {
        name: 'custom',
        record,
        read: vi.fn(),
        list: vi.fn(),
        get: vi.fn(),
        write: vi.fn(),
        remove: vi.fn(),
        files: vi.fn(),
      },
    })

    await expect(log.record(entry)).resolves.toMatchObject({ created: false, occurrences: 4 })
    expect(record).toHaveBeenCalledWith(entry, {})
  })
})
