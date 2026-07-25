import { Readable } from 'node:stream'
import * as stdin from './stdin.js'

describe('parse', () => {
  test('behavior: first line is the title, the rest is the body', () => {
    expect(stdin.parse('Filters ignored\n\nThe `--` is swallowed.\n')).toEqual({
      body: 'The `--` is swallowed.',
      title: 'Filters ignored',
    })
  })

  test('behavior: keeps the body structure, including blank lines and headings', () => {
    expect(
      stdin.parse('Filters ignored\n\n## Description\n\nOne.\n\n## Workaround\n\nTwo.\n'),
    ).toEqual({
      body: '## Description\n\nOne.\n\n## Workaround\n\nTwo.',
      title: 'Filters ignored',
    })
  })

  test('behavior: leading blank lines are skipped', () => {
    expect(stdin.parse('\n\n  Filters ignored  \n\nBody.')).toEqual({
      body: 'Body.',
      title: 'Filters ignored',
    })
  })

  test('behavior: no blank line still separates title from body', () => {
    expect(stdin.parse('Filters ignored\nBody on the next line.')).toEqual({
      body: 'Body on the next line.',
      title: 'Filters ignored',
    })
  })

  test('behavior: a title on its own yields an empty body', () => {
    expect(stdin.parse('Filters ignored\n')).toEqual({ body: '', title: 'Filters ignored' })
  })

  test('behavior: carriage returns are normalized', () => {
    expect(stdin.parse('Filters ignored\r\n\r\nBody.\r\n')).toEqual({
      body: 'Body.',
      title: 'Filters ignored',
    })
  })

  // An apostrophe is what breaks the single-quoted `--body` form, so it has to survive this path.
  test('behavior: quotes and backticks survive', () => {
    expect(stdin.parse("`pnpm test` doesn't filter\n\nIt didn't warn either.")).toEqual({
      body: "It didn't warn either.",
      title: "`pnpm test` doesn't filter",
    })
  })

  test.for(['', '   ', '\n\n\n'])('behavior: %j has no title', (contents) => {
    expect(stdin.parse(contents)).toBeUndefined()
  })
})

describe('read', () => {
  test('behavior: reads a stream to the end', async () => {
    const stream = Readable.from(['Filters ignored\n', '\n', 'Body.\n'])
    expect(await stdin.read({ stream })).toBe('Filters ignored\n\nBody.\n')
  })

  test('behavior: whitespace-only input counts as nothing', async () => {
    expect(await stdin.read({ stream: Readable.from(['  \n\n']) })).toBeUndefined()
  })

  // The suite itself proves this: a hang here would stall every test that runs `log`.
  test('behavior: returns without reading when nothing is piped', async () => {
    expect(await stdin.read()).toBeUndefined()
  })
})
