import type * as Entry from '../src/Entry.js'
import type * as Store from '../src/Store.js'

const canonicalEntry = {
  body: 'The tool required an unnecessary workaround.',
  context: {
    execution: 'opaque-reference',
    nested: { attempts: 2, recovered: false },
    source: 'production-agent',
  },
  issue: 'wevm/frog#123',
  labels: ['agent', 'tooling'],
  severity: 'major',
  target: 'wevm/frog',
  title: 'Tool result omitted its state',
} as const satisfies Entry.serialize.Options

/** Runs the canonical persistence contract against a store implementation. */
export function storeContract(name: string, create: () => Promise<Store.Adapter>) {
  describe(`${name} store contract`, () => {
    test('preserves the complete canonical entry schema', async () => {
      const store = await create()
      const written = await store.write(canonicalEntry)

      expect(written.id).toBeTruthy()
      expect(written.location).toBeTruthy()
      expect(await store.get(written.id)).toEqual({ ...canonicalEntry, id: written.id })
      expect(await store.read()).toEqual([{ ...canonicalEntry, id: written.id }])
      expect(await store.list()).toEqual([written.id])
      if (store.files) expect(await store.files(written.id)).toEqual(expect.any(Array))

      const updated = {
        ...canonicalEntry,
        body: 'The workaround is no longer required.',
        context: { source: 'operator', verified: true },
        labels: ['resolved'],
        severity: 'minor',
      } as const satisfies Entry.serialize.Options
      await store.write(updated, { id: written.id })
      expect(await store.get(written.id)).toEqual({ ...updated, id: written.id })

      await expect(store.remove(written.id)).resolves.toBe(true)
      await expect(store.remove(written.id)).resolves.toBe(false)
      await expect(store.list()).resolves.toEqual([])
    })
  })
}
