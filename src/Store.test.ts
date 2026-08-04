import fs from 'node:fs/promises'
import path from 'node:path'
import { tmpdir, writeFile } from '../test/helpers.js'
import { storeContract } from '../test/storeContract.js'
import type * as Entry from './Entry.js'
import * as Store from './Store.js'

const entry = "---\ntitle: 'Filters are ignored'\n---\n\nBody.\n"

storeContract('file', async () => Store.adapter({ root: await tmpdir() }))

/** Writes an entry's write-up, creating its directory. */
function write(id: string, root: string, contents = entry) {
  return writeFile(Store.toPath(id), contents, root)
}

test('behavior: an async adapter scope redirects every store operation', async () => {
  const entries = new Map<string, Entry.Entry>()
  const scoped: Store.Adapter = {
    name: 'memory',
    read: async () => [...entries.values()],
    list: async () => [...entries.keys()],
    get: async (id) => entries.get(id)!,
    write: async (value, options = {}) => {
      const id = options.id ?? 'memory-id'
      entries.set(id, { ...value, id })
      return { file: `memory:${id}`, id }
    },
    remove: async (id) => entries.delete(id),
    files: async () => [],
  }
  const root = await tmpdir()
  const value = { body: 'Body.', severity: 'minor', title: 'Scoped' } as const

  await Store.withAdapter(scoped, async () => {
    expect(Store.activeName()).toBe('memory')
    await expect(Store.write(value, { root })).resolves.toEqual({
      file: 'memory:memory-id',
      id: 'memory-id',
    })
    await expect(Store.list({ root })).resolves.toEqual(['memory-id'])
    await expect(Store.get('memory-id', { root })).resolves.toEqual({ ...value, id: 'memory-id' })
    await expect(Store.files('memory-id', { root })).resolves.toEqual([])
    await expect(Store.remove('memory-id', { root })).resolves.toBe(true)
  })
  expect(Store.activeName()).toBe('file')
})

describe('write', () => {
  test('behavior: mints an id and returns the repo-relative path', async () => {
    const root = await tmpdir()
    const { file, id } = await Store.write(
      { body: 'Body.', severity: 'minor', title: 'Filters are ignored' },
      { root },
    )
    expect(id).toMatch(/^\d{14}-filters-are-ignored$/)
    expect(file).toBe(`.agents/friction-log/${id}/friction.md`)
    expect(await fs.readFile(path.join(root, file), 'utf8')).toMatchInlineSnapshot(`
      "---
      title: 'Filters are ignored'
      severity: 'minor'
      ---

      Body.
      "
    `)
  })

  test('behavior: reuses a supplied id', async () => {
    const root = await tmpdir()
    const { id } = await Store.write(
      { body: 'Body.', severity: 'minor', title: 'Slow' },
      { id: 'known-id', root },
    )
    expect(id).toBe('known-id')
  })

  test('behavior: a second entry with the same title does not overwrite the first', async () => {
    const root = await tmpdir()
    const entry = { body: 'Body.', severity: 'minor', title: 'Filters are ignored' } as const

    const first = await Store.write(entry, { root })
    const second = await Store.write({ ...entry, body: 'Different.' }, { root })

    // Claiming the directory is what keeps these apart when both land in the same second.
    expect(second.id).not.toBe(first.id)
    expect((await Store.get(first.id, { root })).body).toBe('Body.')
    expect((await Store.get(second.id, { root })).body).toBe('Different.')
  })

  test('behavior: concurrent writes of one title all land', async () => {
    const root = await tmpdir()
    const entry = { body: 'Body.', severity: 'minor', title: 'Filters are ignored' } as const

    const written = await Promise.all(Array.from({ length: 5 }, () => Store.write(entry, { root })))

    expect(new Set(written.map((value) => value.id)).size).toBe(5)
    expect((await Store.list({ root })).length).toBe(5)
  })

  test('behavior: rewriting leaves artifacts alone', async () => {
    const root = await tmpdir()
    await write('one', root)
    await writeFile(`${Store.toArtifacts('one')}/repro.ts`, 'export {}\n', root)

    await Store.write({ body: 'Body.', severity: 'minor', title: 'Slow' }, { id: 'one', root })

    expect(await Store.files('one', { root })).toMatchInlineSnapshot(`
      [
        ".agents/friction-log/one/artifacts/repro.ts",
        ".agents/friction-log/one/friction.md",
      ]
    `)
  })

  test('behavior: round trips through get', async () => {
    const root = await tmpdir()
    const entry = {
      body: 'Body.',
      severity: 'blocker',
      target: 'viem',
      title: 'Filters are ignored',
    } as const
    const { id } = await Store.write(entry, { root })
    expect(await Store.get(id, { root })).toEqual({ ...entry, id })
  })
})

describe('list', () => {
  test('behavior: returns sorted ids and skips non-entries', async () => {
    const root = await tmpdir()
    for (const id of ['apple', 'zebra', 'middle', '.hidden']) await write(id, root)
    for (const name of ['README.md', 'TEMPLATE.md', 'config.json', 'notes.txt'])
      await writeFile(`${Store.dir}/${name}`, entry, root)

    expect(await Store.list({ root })).toMatchInlineSnapshot(`
      [
        "apple",
        "middle",
        "zebra",
      ]
    `)
  })

  test('behavior: a directory without a write-up is not an entry', async () => {
    const root = await tmpdir()
    await write('real', root)
    await writeFile(`${Store.toArtifacts('stray')}/repro.ts`, 'export {}\n', root)

    expect(await Store.list({ root })).toEqual(['real'])
  })

  test('behavior: a missing directory is not an error', async () => {
    expect(await Store.list({ root: await tmpdir() })).toEqual([])
  })
})

describe('read', () => {
  test('behavior: parses every entry', async () => {
    const root = await tmpdir()
    await write('one', root)
    await write('two', root)
    expect((await Store.read({ root })).map((entry) => entry.id)).toEqual(['one', 'two'])
  })

  test('error: surfaces the first malformed entry', async () => {
    const root = await tmpdir()
    await write('broken', root, '# no frontmatter\n')
    await expect(Store.read({ root })).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Entry.MalformedError: Entry \`broken\` has no valid YAML frontmatter block.]`,
    )
  })
})

describe('files', () => {
  test('behavior: lists the write-up and every artifact', async () => {
    const root = await tmpdir()
    await write('one', root)
    await writeFile(`${Store.toArtifacts('one')}/repro.ts`, 'export {}\n', root)
    await writeFile(`${Store.toArtifacts('one')}/nested/fixture.json`, '{}\n', root)

    expect(await Store.files('one', { root })).toMatchInlineSnapshot(`
      [
        ".agents/friction-log/one/artifacts/nested/fixture.json",
        ".agents/friction-log/one/artifacts/repro.ts",
        ".agents/friction-log/one/friction.md",
      ]
    `)
  })

  test('behavior: a missing entry has no files', async () => {
    expect(await Store.files('nope', { root: await tmpdir() })).toEqual([])
  })
})

describe('remove', () => {
  test('behavior: reports whether the entry was there', async () => {
    const root = await tmpdir()
    await write('one', root)
    expect(await Store.remove('one', { root })).toBe(true)
    expect(await Store.remove('one', { root })).toBe(false)
  })

  test('behavior: takes the artifacts with it', async () => {
    const root = await tmpdir()
    await write('one', root)
    await writeFile(`${Store.toArtifacts('one')}/repro.ts`, 'export {}\n', root)

    expect(await Store.remove('one', { root })).toBe(true)
    expect(await Store.files('one', { root })).toEqual([])
  })
})

describe('toDir', () => {
  test('behavior: builds a repo-relative directory', () => {
    expect(Store.toDir('lazy-squids-chew')).toBe('.agents/friction-log/lazy-squids-chew')
  })
})

describe('toPath', () => {
  test('behavior: builds a repo-relative path', () => {
    expect(Store.toPath('lazy-squids-chew')).toBe(
      '.agents/friction-log/lazy-squids-chew/friction.md',
    )
  })
})

describe('toArtifacts', () => {
  test('behavior: builds a repo-relative directory', () => {
    expect(Store.toArtifacts('lazy-squids-chew')).toBe(
      '.agents/friction-log/lazy-squids-chew/artifacts',
    )
  })
})

describe('toId', () => {
  test.for([
    ['.agents/friction-log/lazy-squids-chew/friction.md', 'lazy-squids-chew'],
    ['.agents/friction-log/lazy-squids-chew/artifacts/repro.ts', undefined],
    ['.agents/friction-log/friction.md', undefined],
    ['.agents/friction-log/README.md', undefined],
    ['.agents/friction-log/one.md', undefined],
    ['.agents/friction-log/.hidden/friction.md', undefined],
    ['.agents/friction-log/nested/deep/friction.md', undefined],
    ['.agents/other/one/friction.md', undefined],
    ['src/index.ts', undefined],
  ] as const)('behavior: %s', ([file, expected]) => {
    expect(Store.toId(file)).toBe(expected)
  })

  test('behavior: inverts toPath', () => {
    expect(Store.toId(Store.toPath('lazy-squids-chew'))).toBe('lazy-squids-chew')
  })
})
