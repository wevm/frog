import * as helpers from '../test/helpers.js'
import * as Git from './Git.js'
import * as Store from './Store.js'

const entry = "---\ntitle: 'Filters are ignored'\n---\n\nBody.\n"

describe('root', () => {
  test('behavior: returns the repository root', async () => {
    const cwd = await helpers.repo()
    expect(await Git.root({ cwd })).toBe(cwd)
  })

  test('behavior: undefined outside a repository', async () => {
    expect(await Git.root({ cwd: await helpers.tmpdir() })).toBeUndefined()
  })
})

describe('repo', () => {
  test.for([
    ['git@github.com:wevm/viem.git', 'wevm/viem'],
    ['https://github.com/wevm/viem.git', 'wevm/viem'],
    ['https://github.com/wevm/viem', 'wevm/viem'],
    ['ssh://git@github.com/wevm/viem.git', 'wevm/viem'],
    ['git@github.com:wevm/frictionsets.dev.git', 'wevm/frictionsets.dev'],
    ['git@gitlab.com:wevm/viem.git', undefined],
    ['https://example.com/wevm/viem.git', undefined],
  ] as const)('behavior: %s', async ([remote, expected]) => {
    const cwd = await helpers.repo({ remote })
    expect(await Git.repo({ cwd })).toBe(expected)
  })

  test('behavior: undefined without an origin remote', async () => {
    expect(await Git.repo({ cwd: await helpers.repo() })).toBeUndefined()
  })
})

describe('head', () => {
  test('behavior: returns the current sha', async () => {
    const cwd = await helpers.repo()
    await helpers.writeFile('a.txt', 'a', cwd)
    const sha = await helpers.commit('add a', cwd)
    expect(await Git.head({ cwd })).toBe(sha)
  })

  test('behavior: undefined in a repository with no commits', async () => {
    expect(await Git.head({ cwd: await helpers.repo() })).toBeUndefined()
  })
})

describe('author', () => {
  test('behavior: returns the configured committer name', async () => {
    expect(await Git.author({ cwd: await helpers.repo() })).toBe('Test User')
  })
})

describe('provenance', () => {
  test('behavior: reports the commit that added the file', async () => {
    const cwd = await helpers.repo()
    const file = Store.toPath('one')
    await helpers.writeFile(file, entry, cwd)
    const sha = await helpers.commit('log friction', cwd)

    // A later commit touching the same file must not shift the attribution.
    await helpers.writeFile(file, `${entry}\nMore.\n`, cwd)
    await helpers.commit('expand friction', cwd)

    const provenance = await Git.provenance(file, { cwd })
    const { date, ...rest } = provenance ?? {}
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(rest).toEqual({ author: 'Test User', sha })
  })

  test('behavior: undefined for an uncommitted file', async () => {
    const cwd = await helpers.repo()
    await helpers.writeFile(Store.toPath('one'), entry, cwd)
    expect(await Git.provenance(Store.toPath('one'), { cwd })).toBeUndefined()
  })

  test('behavior: undefined for a file that never existed', async () => {
    const cwd = await helpers.repo()
    await helpers.writeFile('a.txt', 'a', cwd)
    await helpers.commit('add a', cwd)
    expect(await Git.provenance(Store.toPath('ghost'), { cwd })).toBeUndefined()
  })
})

describe('changedSince', () => {
  test('behavior: lists entries added since a ref', async () => {
    const cwd = await helpers.repo()
    await helpers.writeFile('a.txt', 'a', cwd)
    const base = await helpers.commit('add a', cwd)

    await helpers.writeFile(Store.toPath('one'), entry, cwd)
    await helpers.writeFile('b.txt', 'b', cwd)
    await helpers.commit('log friction', cwd)

    expect(await Git.changedSince(base, Store.dir, { cwd })).toEqual([Store.toPath('one')])
  })

  test('behavior: empty when nothing under the directory changed', async () => {
    const cwd = await helpers.repo()
    await helpers.writeFile('a.txt', 'a', cwd)
    const base = await helpers.commit('add a', cwd)
    await helpers.writeFile('b.txt', 'b', cwd)
    await helpers.commit('add b', cwd)

    expect(await Git.changedSince(base, Store.dir, { cwd })).toEqual([])
  })
})

describe('add, rm, and commit', () => {
  test('behavior: stages and commits an entry', async () => {
    const cwd = await helpers.repo()
    await helpers.writeFile('a.txt', 'a', cwd)
    await helpers.commit('add a', cwd)

    const file = Store.toPath('one')
    await helpers.writeFile(file, entry, cwd)
    await Git.add([file], { cwd })
    expect(await Git.commit('log friction', { cwd })).toBe(true)
    expect(await helpers.git(['show', '--name-only', '--format=%s', 'HEAD'], cwd)).toContain(file)
  })

  test('behavior: stages and commits a removal', async () => {
    const cwd = await helpers.repo()
    const file = Store.toPath('one')
    await helpers.writeFile(file, entry, cwd)
    await helpers.commit('log friction', cwd)

    await Git.rm([file], { cwd })
    expect(await Git.commit('resolve friction', { cwd })).toBe(true)
    expect(await helpers.git(['ls-files'], cwd)).not.toContain(file)
  })

  test('behavior: commit reports false when nothing is staged', async () => {
    const cwd = await helpers.repo()
    await helpers.writeFile('a.txt', 'a', cwd)
    await helpers.commit('add a', cwd)
    expect(await Git.commit('nothing to do', { cwd })).toBe(false)
  })

  test('behavior: add and rm are no-ops for an empty list', async () => {
    const cwd = await helpers.repo()
    await expect(Git.add([], { cwd })).resolves.toBeUndefined()
    await expect(Git.rm([], { cwd })).resolves.toBeUndefined()
  })
})
