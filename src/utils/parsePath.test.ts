import { expect, test } from 'vitest'
import { parsePath } from './parsePath.js'

test('correct path if no trailing slash found', async () => {
  const imagePaths = parsePath('/foo')
  expect(imagePaths).toEqual('/foo')
})

test('correct path if trailing slash found', async () => {
  const imagePaths = parsePath('/foo/')
  expect(imagePaths).toEqual('/foo')
})

test('correct path with search params', async () => {
  const imagePaths = parsePath('/foo?foo=bar&baz=frog')
  expect(imagePaths).toEqual('/foo')
})

test('correct path with search params and trailing slash', async () => {
  const imagePaths = parsePath('/foo?foo=bar&baz=frog/')
  expect(imagePaths).toEqual('/foo')
})
