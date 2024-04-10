import { expect, test } from 'vitest'
import { parseActionPath } from './parseActionPath.js'

test('correct path without ".." segment', async () => {
  const path = parseActionPath('https://my-frog', '/foo')
  expect(path).toEqual('https://my-frog/foo')
})

test('correct path with ".." segment', async () => {
  const path = parseActionPath('https://my-frog', '/foo/../bar')
  expect(path).toEqual('https://my-frog/bar')
})
