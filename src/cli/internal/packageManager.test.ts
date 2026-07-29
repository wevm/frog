import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as helpers from '../../../test/helpers.js'
import * as packageManager from './packageManager.js'

describe('resolve', () => {
  test.each([
    [{ npm_config_user_agent: 'npm/11.0.0 node/v24' }, 'npx frog'],
    [{ npm_config_user_agent: 'pnpm/11.0.0 npm/? node/v24' }, 'pnpx frog'],
    [{ npm_config_user_agent: 'bun/1.2.0 npm/? node/v24' }, 'bunx frog'],
    [{ npm_config_user_agent: 'yarn/4.9.2 npm/? node/v24' }, 'yarn dlx frog'],
    [{ npm_execpath: '/usr/local/lib/pnpm.cjs' }, 'pnpx frog'],
    [{ npm_execpath: '/usr/local/lib/bun' }, 'bunx frog'],
    [
      {
        npm_config_user_agent: 'corepack/0.31.0 node/v24',
        npm_execpath: '/usr/local/lib/pnpm.cjs',
      },
      'pnpx frog',
    ],
    [
      {
        npm_config_user_agent: 'npm/11.0.0 node/v24',
        npm_execpath: '/home/bunny/.nvm/npm-cli.js',
      },
      'npx frog',
    ],
    [{ npm_execpath: '/home/bunny/.nvm/npm-cli.js' }, 'npx frog'],
    [{}, undefined],
  ])('behavior: resolves the invoking package manager', async (env, expected) => {
    expect(await packageManager.resolve({ env })).toBe(expected)
  })

  test('behavior: prefers the project package manager', async () => {
    const root = await helpers.tmpdir()
    await fs.writeFile(
      path.join(root, 'package.json'),
      JSON.stringify({ packageManager: 'pnpm@11.15.0' }),
      'utf8',
    )

    expect(
      await packageManager.resolve({
        env: { npm_config_user_agent: 'npm/11.0.0 node/v24' },
        root,
      }),
    ).toBe('pnpx frog')
  })

  test('behavior: falls back to the invoking package manager', async () => {
    expect(
      await packageManager.resolve({
        env: { npm_config_user_agent: 'bun/1.2.0 npm/? node/v24' },
        root: await helpers.tmpdir(),
      }),
    ).toBe('bunx frog')
  })
})
