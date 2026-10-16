import path from 'node:path'
import * as helpers from '../../../test/helpers.js'
import * as context from './context.js'

test('behavior: normalizes the repository root for local consumers', async () => {
  const cwd = await helpers.repo()

  expect((await context.resolve({ cwd })).root).toBe(path.resolve(cwd))
})
