import fs from 'node:fs/promises'
import path from 'node:path'
import * as cli from '../../../test/cli.js'
import { github } from '../../../test/github.js'
import * as helpers from '../../../test/helpers.js'
import * as Config from '../../Config.js'

type Listed = { targets: { name: string; repo: string }[] }

/** Installs a dependency declaring the given repository, in whichever field. */
async function install(
  cwd: string,
  name: string,
  options: {
    bugs?: string
    dependencies?: Record<string, string>
    directory?: string
    homepage?: string
    packageName?: string
    repository?: string
  } = {},
): Promise<void> {
  await helpers.writeFile(
    `${options.directory ?? 'node_modules'}/${name}/package.json`,
    JSON.stringify({
      name: options.packageName ?? name,
      ...(options.bugs ? { bugs: { url: options.bugs } } : {}),
      ...(options.dependencies ? { dependencies: options.dependencies } : {}),
      ...(options.homepage ? { homepage: options.homepage } : {}),
      ...(options.repository ? { repository: { type: 'git', url: options.repository } } : {}),
    }),
    cwd,
  )
}

async function declare(cwd: string, dependencies: Record<string, string>): Promise<void> {
  await helpers.writeFile('package.json', JSON.stringify({ dependencies, name: 'app' }), cwd)
}

/** A repository that has committed its consent, or opted out. */
function config(enabled: boolean, allowFrom?: readonly string[]): string {
  return JSON.stringify({ inbound: { enabled, ...(allowFrom ? { allowFrom } : {}) } })
}

function env(url: string, cache: string): Record<string, string> {
  return { GITHUB_API_URL: url, GITHUB_TOKEN: 'test-token', XDG_CACHE_HOME: cache }
}

test('behavior: lists dependencies whose repositories accept reports', async () => {
  const cwd = await helpers.repo()
  await declare(cwd, { ox: '^1.0.0', typescript: '^5.0.0', viem: '^2.0.0' })
  await install(cwd, 'viem', { repository: 'git+https://github.com/wevm/viem.git' })
  await install(cwd, 'ox', { repository: 'github:wevm/ox' })
  await install(cwd, 'typescript', { repository: 'https://github.com/microsoft/TypeScript' })

  const instance = await github(
    {},
    {
      files: {
        'microsoft/TypeScript': { [Config.file]: config(false) },
        'wevm/ox': { [Config.file]: config(true) },
        'wevm/viem': { [Config.file]: config(true) },
      },
    },
  )

  const result = await cli.data<Listed>(
    ['targets', '--cwd', cwd],
    env(instance.url, await helpers.tmpdir()),
  )

  expect(result).toMatchInlineSnapshot(`
    {
      "targets": [
        {
          "name": "ox",
          "repo": "wevm/ox",
        },
        {
          "name": "viem",
          "repo": "wevm/viem",
        },
      ],
    }
  `)
})

test('behavior: includes optional dependencies', async () => {
  const cwd = await helpers.repo()
  await helpers.writeFile(
    'package.json',
    JSON.stringify({ name: 'app', optionalDependencies: { viem: '^2.0.0' } }),
    cwd,
  )
  await install(cwd, 'viem', { repository: 'https://github.com/wevm/viem' })

  const instance = await github({}, { files: { 'wevm/viem': { [Config.file]: config(true) } } })
  const result = await cli.data<Listed>(
    ['targets', '--cwd', cwd],
    env(instance.url, await helpers.tmpdir()),
  )

  expect(result.targets).toEqual([{ name: 'viem', repo: 'wevm/viem' }])
})

test('behavior: includes nested transitive dependencies', async () => {
  const cwd = await helpers.repo()
  await declare(cwd, { parent: '^1.0.0' })
  await install(cwd, 'parent', { dependencies: { deep: '^1.0.0' } })
  await install(cwd, 'deep', {
    directory: 'node_modules/parent/node_modules',
    repository: 'https://github.com/acme/deep',
  })

  const instance = await github({}, { files: { 'acme/deep': { [Config.file]: config(true) } } })
  const result = await cli.data<Listed>(
    ['targets', '--cwd', cwd],
    env(instance.url, await helpers.tmpdir()),
  )

  expect(result.targets).toEqual([{ name: 'deep', repo: 'acme/deep' }])
})

test('behavior: includes transitive dependencies in a pnpm virtual store', async () => {
  const cwd = await helpers.repo()
  const parentStore = 'node_modules/.pnpm/parent@1.0.0/node_modules'
  const deepStore = 'node_modules/.pnpm/deep@1.0.0/node_modules'
  await declare(cwd, { parent: '^1.0.0' })
  await install(cwd, 'parent', {
    dependencies: { deep: '^1.0.0' },
    directory: parentStore,
  })
  await install(cwd, 'deep', {
    directory: deepStore,
    repository: 'https://github.com/acme/deep',
  })
  await fs.symlink('.pnpm/parent@1.0.0/node_modules/parent', path.join(cwd, 'node_modules/parent'))
  await fs.symlink('../../deep@1.0.0/node_modules/deep', path.join(cwd, parentStore, 'deep'))

  const instance = await github({}, { files: { 'acme/deep': { [Config.file]: config(true) } } })
  const result = await cli.data<Listed>(
    ['targets', '--cwd', cwd],
    env(instance.url, await helpers.tmpdir()),
  )

  expect(result.targets).toEqual([{ name: 'deep', repo: 'acme/deep' }])
})

test('behavior: lists an aliased dependency by its canonical package name', async () => {
  const cwd = await helpers.repo()
  await declare(cwd, { legacy: 'npm:actual@^1.0.0' })
  await install(cwd, 'legacy', {
    packageName: 'actual',
    repository: 'https://github.com/acme/actual',
  })

  const instance = await github({}, { files: { 'acme/actual': { [Config.file]: config(true) } } })
  const result = await cli.data<Listed>(
    ['targets', '--cwd', cwd],
    env(instance.url, await helpers.tmpdir()),
  )

  expect(result.targets).toEqual([{ name: 'actual', repo: 'acme/actual' }])
})

test('behavior: an exact direct package wins over an alias with the same canonical name', async () => {
  const cwd = await helpers.repo()
  await declare(cwd, { actual: '^2.0.0', legacy: 'npm:actual@^1.0.0' })
  await install(cwd, 'actual', { repository: 'https://github.com/acme/new' })
  await install(cwd, 'legacy', {
    packageName: 'actual',
    repository: 'https://github.com/acme/old',
  })

  const instance = await github(
    {},
    {
      files: {
        'acme/new': { [Config.file]: config(true) },
        'acme/old': { [Config.file]: config(true) },
      },
    },
  )
  const result = await cli.data<Listed>(
    ['targets', '--cwd', cwd],
    env(instance.url, await helpers.tmpdir()),
  )

  expect(result.targets).toEqual([{ name: 'actual', repo: 'acme/new' }])
  expect(instance.requests.some((request) => request.path.includes('acme/old'))).toBe(false)
})

test('behavior: a canonical transitive package wins over a colliding dependency alias', async () => {
  const cwd = await helpers.repo()
  await declare(cwd, { legacy: 'npm:actual@^1.0.0', parent: '^1.0.0' })
  await install(cwd, 'legacy', {
    packageName: 'actual',
    repository: 'https://github.com/acme/actual',
  })
  await install(cwd, 'parent', { dependencies: { legacy: '^2.0.0' } })
  await install(cwd, 'legacy', {
    directory: 'node_modules/parent/node_modules',
    repository: 'https://github.com/acme/legacy',
  })

  const instance = await github(
    {},
    {
      files: {
        'acme/actual': { [Config.file]: config(true) },
        'acme/legacy': { [Config.file]: config(true) },
      },
    },
  )
  const result = await cli.data<Listed>(
    ['targets', '--cwd', cwd],
    env(instance.url, await helpers.tmpdir()),
  )

  expect(result.targets).toEqual([
    { name: 'actual', repo: 'acme/actual' },
    { name: 'legacy', repo: 'acme/legacy' },
  ])
})

test('behavior: omits a transitive package whose installed copies name different repositories', async () => {
  const cwd = await helpers.repo()
  await declare(cwd, { one: '^1.0.0', two: '^1.0.0' })
  await install(cwd, 'one', { dependencies: { shared: '^1.0.0' } })
  await install(cwd, 'two', { dependencies: { shared: '^2.0.0' } })
  await install(cwd, 'shared', {
    directory: 'node_modules/one/node_modules',
    repository: 'https://github.com/acme/one',
  })
  await install(cwd, 'shared', {
    directory: 'node_modules/two/node_modules',
    repository: 'https://github.com/acme/two',
  })

  const instance = await github()
  const result = await cli.data<Listed>(
    ['targets', '--cwd', cwd],
    env(instance.url, await helpers.tmpdir()),
  )

  expect(result.targets).toEqual([])
  expect(instance.requests).toEqual([])
})

test('behavior: includes a transitive package when only one installed copy names a repository', async () => {
  const cwd = await helpers.repo()
  await declare(cwd, { one: '^1.0.0', two: '^1.0.0' })
  await install(cwd, 'one', { dependencies: { shared: '^1.0.0' } })
  await install(cwd, 'two', { dependencies: { shared: '^2.0.0' } })
  await install(cwd, 'shared')
  await install(cwd, 'shared', {
    directory: 'node_modules/two/node_modules',
    repository: 'https://github.com/acme/shared',
  })

  const instance = await github({}, { files: { 'acme/shared': { [Config.file]: config(true) } } })
  const result = await cli.data<Listed>(
    ['targets', '--cwd', cwd],
    env(instance.url, await helpers.tmpdir()),
  )

  expect(result.targets).toEqual([{ name: 'shared', repo: 'acme/shared' }])
})

test('behavior: a root package wins over a conflicting transitive copy', async () => {
  const cwd = await helpers.repo()
  await declare(cwd, { parent: '^1.0.0', shared: '^1.0.0' })
  await install(cwd, 'parent', { dependencies: { shared: '^2.0.0' } })
  await install(cwd, 'shared', { repository: 'https://github.com/acme/root' })
  await install(cwd, 'shared', {
    directory: 'node_modules/parent/node_modules',
    repository: 'https://github.com/acme/nested',
  })

  const instance = await github(
    {},
    {
      files: {
        'acme/nested': { [Config.file]: config(true) },
        'acme/root': { [Config.file]: config(true) },
      },
    },
  )
  const result = await cli.data<Listed>(
    ['targets', '--cwd', cwd],
    env(instance.url, await helpers.tmpdir()),
  )

  expect(result.targets).toEqual([{ name: 'shared', repo: 'acme/root' }])
  expect(instance.requests.some((request) => request.path.includes('acme/nested'))).toBe(false)
})

test('behavior: applies each receiver allowFrom policy', async () => {
  const cwd = await helpers.repo({ remote: 'https://github.com/acme/app' })
  await declare(cwd, { ox: '^1.0.0', viem: '^2.0.0' })
  await install(cwd, 'ox', { repository: 'https://github.com/wevm/ox' })
  await install(cwd, 'viem', { repository: 'https://github.com/wevm/viem' })

  const instance = await github(
    {},
    {
      files: {
        'wevm/ox': { [Config.file]: config(true, ['other/*']) },
        'wevm/viem': { [Config.file]: config(true, ['acme/*']) },
      },
    },
  )
  const result = await cli.data<Listed>(
    ['targets', '--cwd', cwd],
    env(instance.url, await helpers.tmpdir()),
  )

  expect(result.targets).toEqual([{ name: 'viem', repo: 'wevm/viem' }])
})

test('behavior: a dependency declaring no GitHub repository is skipped without a lookup', async () => {
  const cwd = await helpers.repo()
  await declare(cwd, { private: '^1.0.0' })
  await install(cwd, 'private', { repository: 'https://gitlab.com/acme/private.git' })

  const instance = await github()

  const result = await cli.data<Listed>(
    ['targets', '--cwd', cwd],
    env(instance.url, await helpers.tmpdir()),
  )

  expect(result.targets).toEqual([])
  expect(instance.requests).toEqual([])
})

test('behavior: falls back to homepage, then bugs', async () => {
  const cwd = await helpers.repo()
  await declare(cwd, { one: '^1.0.0', two: '^1.0.0' })
  await install(cwd, 'one', { homepage: 'https://github.com/wevm/one' })
  await install(cwd, 'two', { bugs: 'https://github.com/wevm/two/issues' })

  const instance = await github(
    {},
    {
      files: {
        'wevm/one': { [Config.file]: config(true) },
        'wevm/two': { [Config.file]: config(true) },
      },
    },
  )

  const result = await cli.data<Listed>(
    ['targets', '--cwd', cwd],
    env(instance.url, await helpers.tmpdir()),
  )

  expect(result.targets).toEqual([
    { name: 'one', repo: 'wevm/one' },
    { name: 'two', repo: 'wevm/two' },
  ])
})

test('behavior: no dependencies lists nothing', async () => {
  const instance = await github()
  const result = await cli.data<Listed>(
    ['targets', '--cwd', await helpers.repo()],
    env(instance.url, await helpers.tmpdir()),
  )
  expect(result.targets).toEqual([])
})

test('behavior: a second run is served from the cache', async () => {
  const cwd = await helpers.repo()
  await declare(cwd, { viem: '^2.0.0' })
  await install(cwd, 'viem', { repository: 'https://github.com/wevm/viem' })

  const instance = await github({}, { files: { 'wevm/viem': { [Config.file]: config(true) } } })
  const cache = await helpers.tmpdir()

  await cli.data<Listed>(['targets', '--cwd', cwd], env(instance.url, cache))
  const first = instance.requests.length
  expect(first).toBeGreaterThan(0)

  const second = await cli.data<Listed>(['targets', '--cwd', cwd], env(instance.url, cache))

  expect(second.targets).toEqual([{ name: 'viem', repo: 'wevm/viem' }])
  expect(instance.requests.length).toBe(first)
})

test('behavior: a repository that accepts nothing is not re-asked', async () => {
  const cwd = await helpers.repo()
  await declare(cwd, { viem: '^2.0.0' })
  await install(cwd, 'viem', { repository: 'https://github.com/wevm/viem' })

  // No config committed at all, which is the common case and the one worth caching.
  const instance = await github()
  const cache = await helpers.tmpdir()

  await cli.data<Listed>(['targets', '--cwd', cwd], env(instance.url, cache))
  const first = instance.requests.length

  const second = await cli.data<Listed>(['targets', '--cwd', cwd], env(instance.url, cache))

  expect(second.targets).toEqual([])
  expect(instance.requests.length).toBe(first)
})

test('behavior: a transient config failure is not cached as rejection', async () => {
  const cwd = await helpers.repo()
  await declare(cwd, { viem: '^2.0.0' })
  await install(cwd, 'viem', { repository: 'https://github.com/wevm/viem' })

  const errors: Record<string, number> = { 'wevm/viem': 503 }
  const instance = await github(
    {},
    {
      errors,
      files: { 'wevm/viem': { [Config.file]: config(true) } },
    },
  )
  const cache = await helpers.tmpdir()

  const first = await cli.data<Listed>(['targets', '--cwd', cwd], env(instance.url, cache))
  expect(first.targets).toEqual([])

  delete errors['wevm/viem']
  const second = await cli.data<Listed>(['targets', '--cwd', cwd], env(instance.url, cache))
  expect(second.targets).toEqual([{ name: 'viem', repo: 'wevm/viem' }])
})

test('behavior: one repository behind several packages is asked about once', async () => {
  const cwd = await helpers.repo()
  await declare(cwd, { '@changesets/cli': '^2.0.0', '@changesets/config': '^3.0.0' })
  await install(cwd, '@changesets/cli', {
    repository: 'https://github.com/changesets/changesets/tree/main/packages/cli',
  })
  await install(cwd, '@changesets/config', {
    repository: 'https://github.com/changesets/changesets/tree/main/packages/config',
  })

  const instance = await github(
    {},
    { files: { 'changesets/changesets': { [Config.file]: config(true) } } },
  )

  const result = await cli.data<Listed>(
    ['targets', '--cwd', cwd],
    env(instance.url, await helpers.tmpdir()),
  )

  expect(result.targets).toEqual([
    { name: '@changesets/cli', repo: 'changesets/changesets' },
    { name: '@changesets/config', repo: 'changesets/changesets' },
  ])
  expect(instance.requests.filter((request) => request.path.includes('contents')).length).toBe(1)
})
