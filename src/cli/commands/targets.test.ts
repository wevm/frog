import * as cli from '../../../test/cli.js'
import { github } from '../../../test/github.js'
import * as helpers from '../../../test/helpers.js'
import * as Config from '../../Config.js'

type Listed = { targets: { name: string; repo: string }[] }

/** Installs a dependency declaring the given repository, in whichever field. */
async function install(
  cwd: string,
  name: string,
  options: { bugs?: string; homepage?: string; repository?: string } = {},
): Promise<void> {
  await helpers.writeFile(
    `node_modules/${name}/package.json`,
    JSON.stringify({
      name,
      ...(options.bugs ? { bugs: { url: options.bugs } } : {}),
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
