import fs from 'node:fs/promises'
import path from 'node:path'
import { tmpdir, writeFile } from '../test/helpers.js'
import * as Store from './Store.js'

const entry = "---\ntitle: 'Filters are ignored'\n---\n\nBody.\n"

describe('write', () => {
  test('behavior: mints an id and returns the repo-relative path', async () => {
    const root = await tmpdir()
    const { file, id } = await Store.write(
      { body: 'Body.', severity: 'minor', title: 'Filters are ignored' },
      { root },
    )
    expect(id).toMatch(/^[a-z]+(-[a-z]+)+$/)
    expect(file).toBe(`.agents/frictionsets/${id}.md`)
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

  test('behavior: round trips through get', async () => {
    const root = await tmpdir()
    const frictionset = {
      body: 'Body.',
      severity: 'blocker',
      target: 'viem',
      title: 'Filters are ignored',
    } as const
    const { id } = await Store.write(frictionset, { root })
    expect(await Store.get(id, { root })).toEqual({ ...frictionset, id })
  })
})

describe('list', () => {
  test('behavior: returns sorted ids and skips non-entries', async () => {
    const root = await tmpdir()
    for (const name of [
      'apple.md',
      'zebra.md',
      'middle.md',
      'README.md',
      'TEMPLATE.md',
      'AGENTS.md',
      'CLAUDE.md',
      'GEMINI.md',
      '.hidden.md',
      'config.json',
      'notes.txt',
    ])
      await writeFile(`.agents/frictionsets/${name}`, entry, root)

    expect(await Store.list({ root })).toMatchInlineSnapshot(`
      [
        "apple",
        "middle",
        "zebra",
      ]
    `)
  })

  test('behavior: a missing directory is not an error', async () => {
    expect(await Store.list({ root: await tmpdir() })).toEqual([])
  })
})

describe('read', () => {
  test('behavior: parses every entry', async () => {
    const root = await tmpdir()
    await writeFile('.agents/frictionsets/one.md', entry, root)
    await writeFile('.agents/frictionsets/two.md', entry, root)
    expect((await Store.read({ root })).map((frictionset) => frictionset.id)).toEqual([
      'one',
      'two',
    ])
  })

  test('error: surfaces the first malformed entry', async () => {
    const root = await tmpdir()
    await writeFile('.agents/frictionsets/broken.md', '# no frontmatter\n', root)
    await expect(Store.read({ root })).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Frictionset.MalformedError: Frictionset \`broken\` has no valid YAML frontmatter block.]`,
    )
  })
})

describe('remove', () => {
  test('behavior: reports whether the file was there', async () => {
    const root = await tmpdir()
    await writeFile('.agents/frictionsets/one.md', entry, root)
    expect(await Store.remove('one', { root })).toBe(true)
    expect(await Store.remove('one', { root })).toBe(false)
  })
})

describe('toPath', () => {
  test('behavior: builds a repo-relative path', () => {
    expect(Store.toPath('lazy-squids-chew')).toBe('.agents/frictionsets/lazy-squids-chew.md')
  })
})

describe('toId', () => {
  test.for([
    ['.agents/frictionsets/lazy-squids-chew.md', 'lazy-squids-chew'],
    ['.agents/frictionsets/README.md', undefined],
    ['.agents/frictionsets/TEMPLATE.md', undefined],
    ['.agents/frictionsets/config.json', undefined],
    ['.agents/frictionsets/.hidden.md', undefined],
    ['.agents/frictionsets/nested/one.md', undefined],
    ['.agents/other/one.md', undefined],
    ['src/index.ts', undefined],
  ] as const)('behavior: %s', ([file, expected]) => {
    expect(Store.toId(file)).toBe(expected)
  })

  test('behavior: inverts toPath', () => {
    expect(Store.toId(Store.toPath('lazy-squids-chew'))).toBe('lazy-squids-chew')
  })
})
