import * as helpers from '../../../test/helpers.js'
import * as packageManager from './packageManager.js'

describe('resolve', () => {
  test.each([
    ['npm@11.0.0', 'npm install --global frog'],
    ['pnpm@11.0.0', 'pnpm add --global frog'],
    ['bun@1.2.0', 'bun add --global frog'],
    ['yarn@1.22.22', 'yarn global add frog'],
    ['yarn@4.9.2', 'npm install --global frog'],
  ])('behavior: resolves %s from package.json', async (value, expected) => {
    const root = await helpers.tmpdir()
    await helpers.writeFile('package.json', JSON.stringify({ packageManager: value }), root)

    expect(packageManager.format(await packageManager.resolve({ root }))).toBe(expected)
  })

  test.each([
    ['package-lock.json', '', 'npm install --global frog'],
    ['npm-shrinkwrap.json', '', 'npm install --global frog'],
    ['pnpm-lock.yaml', '', 'pnpm add --global frog'],
    ['pnpm-workspace.yaml', '', 'pnpm add --global frog'],
    ['bun.lock', '', 'bun add --global frog'],
    ['bun.lockb', '', 'bun add --global frog'],
    ['yarn.lock', '# yarn lockfile v1\n', 'yarn global add frog'],
    ['yarn.lock', '__metadata:\n  version: 8\n', 'npm install --global frog'],
    ['.yarnrc.yml', 'nodeLinker: node-modules\n', 'npm install --global frog'],
  ])('behavior: resolves %s from repository markers', async (file, contents, expected) => {
    const root = await helpers.tmpdir()
    await helpers.writeFile(file, contents, root)

    expect(packageManager.format(await packageManager.resolve({ root }))).toBe(expected)
  })

  test('behavior: packageManager takes precedence over conflicting lockfiles', async () => {
    const root = await helpers.tmpdir()
    await helpers.writeFile('package.json', JSON.stringify({ packageManager: 'pnpm@11.0.0' }), root)
    await helpers.writeFile('package-lock.json', '', root)
    await helpers.writeFile('bun.lock', '', root)

    expect(packageManager.format(await packageManager.resolve({ root }))).toBe(
      'pnpm add --global frog',
    )
  })

  test('behavior: conflicting repository markers fall back to npm', async () => {
    const root = await helpers.tmpdir()
    await helpers.writeFile('pnpm-lock.yaml', '', root)
    await helpers.writeFile('bun.lock', '', root)

    expect(packageManager.format(await packageManager.resolve({ root }))).toBe(
      'npm install --global frog',
    )
  })

  test.each([
    ['npm/11.0.0 node/v24', 'npm install --global frog'],
    ['pnpm/11.0.0 npm/? node/v24', 'pnpm add --global frog'],
    ['bun/1.2.0 npm/? node/v24', 'bun add --global frog'],
    ['yarn/1.22.22 npm/? node/v24', 'yarn global add frog'],
    ['yarn/4.9.2 npm/? node/v24', 'npm install --global frog'],
  ])('behavior: resolves the invoking user agent %s as a fallback', async (value, expected) => {
    const root = await helpers.tmpdir()

    expect(
      packageManager.format(
        await packageManager.resolve({
          env: { npm_config_user_agent: value },
          root,
        }),
      ),
    ).toBe(expected)
  })

  test('behavior: missing metadata falls back to npm', async () => {
    expect(
      packageManager.format(await packageManager.resolve({ root: await helpers.tmpdir() })),
    ).toBe('npm install --global frog')
  })
})
