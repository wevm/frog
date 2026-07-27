import type { Entry } from 'frog'
import * as summary from './summary.js'

const repo = 'acme/app'

function entry(id: string, overrides: Partial<Entry.Entry> = {}): Entry.Entry {
  return {
    body: 'The filter was swallowed.',
    id,
    severity: 'minor',
    title: `Friction ${id}`,
    ...overrides,
  }
}

test('behavior: an entry the branch drops is resolved', () => {
  const body = summary.render({
    base: [entry('a', { issue: `${repo}#1` })],
    branch: [],
  })

  expect(body).toContain('## Resolved')
  expect(body).toContain(`[${repo}#1](https://github.com/${repo}/issues/1) Friction a`)
})

test('behavior: an entry the branch adds back is reopened', () => {
  const body = summary.render({
    base: [],
    branch: [entry('a', { issue: `${repo}#1` })],
  })

  expect(body).toContain('## Reopened')
  expect(body).not.toContain('## Resolved')
})

test('behavior: an entry gaining a link is listed as linked', () => {
  const body = summary.render({
    base: [entry('a')],
    branch: [entry('a', { issue: `${repo}#1` })],
  })

  expect(body).toContain('## Linked')
  expect(body).not.toContain('## Reopened')
})

// One pull request accumulates several closures, so the description has to cover all of them at once.
test('behavior: every kind of change appears together', () => {
  const body = summary.render({
    base: [entry('a', { issue: `${repo}#1` }), entry('b')],
    branch: [entry('b', { issue: `${repo}#2` }), entry('c', { issue: `${repo}#3` })],
  })

  expect(body.indexOf('## Resolved')).toBeLessThan(body.indexOf('## Reopened'))
  expect(body.indexOf('## Reopened')).toBeLessThan(body.indexOf('## Linked'))
  expect(body).toContain('Friction a')
  expect(body).toContain('Friction c')
  expect(body).toContain('Friction b')
})

test('behavior: an unlinked entry falls back to its id', () => {
  expect(summary.render({ base: [entry('a')], branch: [] })).toContain('`a` Friction a')
})

test('behavior: no differences leaves the explanation alone', () => {
  const body = summary.render({ base: [entry('a')], branch: [entry('a')] })

  expect(body).not.toContain('## Resolved')
  expect(body).toContain('Opened by the [Frog](https://github.com/wevm/frog) GitHub App')
})
