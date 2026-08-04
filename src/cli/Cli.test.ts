import { serve } from './Cli.js'

test.each([['--version'], ['list', '--help'], ['--schema']])(
  'behavior: %s does not initialize the configured store',
  async (...argv) => {
    let output = ''
    await expect(
      serve(argv, {
        env: { FROG_DATABASE_URL: 'postgres://driver-must-not-load' },
        exit() {},
        stdout(value) {
          output += value
        },
      }),
    ).resolves.toBeUndefined()
    expect(output).toBeTruthy()
  },
)
