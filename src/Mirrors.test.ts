import fs from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from '../test/helpers.js'
import * as Mirrors from './Mirrors.js'
import * as Store from './Store.js'

const first = { issue: 'wevm/viem#1', path: Store.toPath('a') }
const second = { issue: 'wevm/viem#2', path: Store.toPath('b') }

test('behavior: normalizes duplicate and unsorted records', () => {
  expect(Mirrors.from({ mirrors: [second, first, first], version: 1 })).toEqual({
    mirrors: [first, second],
    version: 1,
  })
})

test.each([
  { mirrors: [], version: 2 },
  { mirrors: [{ issue: 'invalid', path: Store.toPath('a') }], version: 1 },
  { mirrors: [{ issue: 'wevm/viem#1', path: '../friction.md' }], version: 1 },
])('error: rejects malformed state %#', (value) => {
  expect(() => Mirrors.from(value)).toThrow(Mirrors.InvalidError)
})

test('behavior: remembers and forgets exact records', () => {
  const remembered = Mirrors.update(Mirrors.empty(), { remember: [second, first, first] })
  expect(remembered.mirrors).toEqual([first, second])
  expect(Mirrors.update(remembered, { forget: [first] }).mirrors).toEqual([second])
})

test('behavior: a missing local journal is empty', async () => {
  expect(await Mirrors.resolve({ root: await tmpdir() })).toEqual(Mirrors.empty())
})

test('behavior: writes and removes the local journal', async () => {
  const root = await tmpdir()
  await Mirrors.write(Mirrors.update(Mirrors.empty(), { remember: [first] }), { root })
  expect(await Mirrors.resolve({ root })).toEqual({ mirrors: [first], version: 1 })

  await Mirrors.write(Mirrors.empty(), { root })
  await expect(fs.stat(path.join(root, Mirrors.file))).rejects.toMatchObject({ code: 'ENOENT' })
})
