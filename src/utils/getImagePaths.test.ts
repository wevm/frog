import { expect, test } from 'vitest'
import { getImagePaths } from './getImagePaths.js'

test('correct image paths for path without parameters', async () => {
  const imagePaths = getImagePaths('/foo')
  expect(imagePaths).toEqual(['/foo/image'])
})

test('correct image paths for path with a single parameter', async () => {
  const imagePaths = getImagePaths('/foo/:bar')
  expect(imagePaths).toEqual(['/foo/:bar/image'])
})

test('correct image paths for path with two parameters', async () => {
  const imagePaths = getImagePaths('/foo/:bar/:baz')
  expect(imagePaths).toEqual(['/foo/:bar/:baz/image'])
})

test('correct image paths for path with one optional parameter', async () => {
  const imagePaths = getImagePaths('/foo/:bar?')
  expect(imagePaths).toEqual(['/foo/image', '/foo/:bar?/image'])
})

test('correct image paths for path with two optional parameters', async () => {
  const imagePaths = getImagePaths('/foo/:bar?/:baz?')
  expect(imagePaths).toEqual([
    '/foo/image',
    '/foo/:bar?/image',
    '/foo/:bar?/:baz?/image',
  ])
})
