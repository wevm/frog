import * as childProcess from 'node:child_process'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as helpers from '../../test/helpers.js'
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

test('error: store setup failures use the requested output format', async () => {
  const root = await helpers.tmpdir()
  const packageRoot = path.join(root, 'frog')
  await fs.cp(path.resolve(import.meta.dirname, '..'), path.join(packageRoot, 'src'), {
    recursive: true,
  })
  await fs.writeFile(path.join(packageRoot, 'package.json'), '{"type":"module"}\n')
  for (const dependency of ['@clack/prompts', '@octokit/rest', 'incur', 'yaml']) {
    const link = path.join(packageRoot, 'node_modules', dependency)
    await fs.mkdir(path.dirname(link), { recursive: true })
    await fs.symlink(path.resolve(import.meta.dirname, '../../node_modules', dependency), link)
  }

  const result = await new Promise<{ code: number | null; stderr: string; stdout: string }>(
    (resolve, reject) => {
      const child = childProcess.spawn(
        process.execPath,
        [
          '--import',
          import.meta.resolve('tsx'),
          path.join(packageRoot, 'src/bin.ts'),
          'list',
          '--format',
          'json',
        ],
        {
          cwd: packageRoot,
          env: { ...process.env, FROG_DATABASE_URL: 'postgres://driver-must-not-load' },
        },
      )
      let stderr = ''
      let stdout = ''
      child.stderr.on('data', (chunk) => (stderr += chunk))
      child.stdout.on('data', (chunk) => (stdout += chunk))
      child.on('error', reject)
      child.on('close', (code) => resolve({ code, stderr, stdout }))
    },
  )

  expect(result.code).toBe(1)
  expect(result.stderr).toBe('')
  expect(JSON.parse(result.stdout)).toEqual({
    code: 'UNKNOWN',
    message: 'The Postgres CLI store requires the optional `pg` package.',
  })
})
