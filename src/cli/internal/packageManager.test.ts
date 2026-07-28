import * as packageManager from './packageManager.js'

describe('current', () => {
  test.each([
    [{ npm_config_user_agent: 'npm/11.0.0 node/v24' }, 'npx frog'],
    [{ npm_config_user_agent: 'pnpm/11.0.0 npm/? node/v24' }, 'pnpx frog'],
    [{ npm_config_user_agent: 'bun/1.2.0 npm/? node/v24' }, 'bunx frog'],
    [{ npm_config_user_agent: 'yarn/4.9.2 npm/? node/v24' }, 'npx frog'],
    [{ npm_execpath: '/usr/local/lib/pnpm.cjs' }, 'pnpx frog'],
    [{ npm_execpath: '/usr/local/lib/bun' }, 'bunx frog'],
    [{}, 'npx frog'],
  ])('behavior: resolves the invoking package manager', (env, expected) => {
    expect(packageManager.current({ env })).toBe(expected)
  })
})
