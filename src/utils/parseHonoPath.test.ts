import { expect, test } from 'vitest'
import { parseHonoPath } from './parseHonoPath.js'

test('correct hono path if no trailing slash found', async () => {
  const imagePaths = parseHonoPath('/foo')
  expect(imagePaths).toEqual('/foo')
})

test('correct hono path if trailing slash found', async () => {
  const imagePaths = parseHonoPath('/foo/')
  expect(imagePaths).toEqual('/foo')
})
