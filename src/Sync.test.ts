import type * as Entry from './Entry.js'
import * as Github from './Github.js'
import * as Store from './Store.js'
import * as Sync from './Sync.js'

const repo = 'wevm/demo'
const labels = ['friction']
const severityLabels = {
  blocker: 'friction:blocker',
  major: 'friction:major',
  minor: 'friction:minor',
} as const

function entry(overrides: Partial<Entry.Entry> = {}): Entry.Entry {
  return { body: 'Body.', id: 'a', severity: 'minor', title: 'Filters ignored', ...overrides }
}

function issue(overrides: Partial<Github.Issue> = {}): Github.Issue {
  return {
    body: Github.renderBody({
      body: 'Body.',
      marker: { hash: Github.hash('Filters ignored'), origin: repo, path: Store.toPath('a') },
    }),
    labels: ['friction', 'friction:minor'],
    number: 1,
    state: 'open',
    title: 'Filters ignored',
    ...overrides,
  }
}

function plan(entries: readonly Entry.Entry[], issues: readonly Github.Issue[]): Sync.Plan {
  return Sync.plan({ entries, issues, labels, repo, severityLabels })
}

describe('plan', () => {
  test('behavior: an entry matching its open issue needs nothing', () => {
    const result = plan([entry({ issue: `${repo}#1` })], [issue()])
    expect(Sync.empty(result)).toBe(true)
  })

  test('behavior: a pending entry is left alone', () => {
    expect(Sync.empty(plan([entry()], []))).toBe(true)
  })

  test('behavior: a closed issue removes its entry', () => {
    const result = plan([entry({ issue: `${repo}#1` })], [issue({ state: 'closed' })])
    expect(result.remove).toEqual(['a'])
    expect(result.write).toEqual([])
  })

  test('behavior: a missing issue clears the link and returns the entry to pending', () => {
    const result = plan([entry({ issue: `${repo}#1` })], [])
    expect(result.clearLink).toEqual([entry()])
    expect(result.clearLink[0]).not.toHaveProperty('issue')
  })

  test('behavior: an edited issue title updates the entry', () => {
    const result = plan(
      [entry({ issue: `${repo}#1` })],
      [issue({ title: 'Filters are still ignored' })],
    )
    expect(result.write).toEqual([
      entry({ issue: `${repo}#1`, title: 'Filters are still ignored' }),
    ])
  })

  test('behavior: an edited issue body updates the entry', () => {
    const result = plan(
      [entry({ issue: `${repo}#1` })],
      [
        issue({
          body: Github.renderBody({ body: 'Rewritten by a maintainer.', marker: { hash: 'x' } }),
        }),
      ],
    )
    expect(result.write[0]?.body).toBe('Rewritten by a maintainer.')
  })

  test('behavior: an open issue with no local file is rebuilt', () => {
    const result = plan([], [issue({ labels: ['friction', 'friction:blocker', 'tooling'] })])
    expect(result.write).toEqual([
      {
        body: 'Body.',
        id: 'a',
        issue: `${repo}#1`,
        labels: ['tooling'],
        severity: 'blocker',
        title: 'Filters ignored',
      },
    ])
  })

  test('behavior: a rebuilt entry with no extra labels omits them', () => {
    expect(plan([], [issue()]).write[0]).not.toHaveProperty('labels')
  })

  test('behavior: a rebuilt entry with no severity label defaults to minor', () => {
    expect(plan([], [issue({ labels: ['friction'] })]).write[0]?.severity).toBe('minor')
  })

  test('behavior: a closed issue with no local file is not resurrected', () => {
    expect(Sync.empty(plan([], [issue({ state: 'closed' })]))).toBe(true)
  })

  // Labelling an issue by hand must not materialize a file: the marker is what names one.
  test('behavior: an issue with no marker is ignored', () => {
    expect(Sync.empty(plan([], [issue({ body: 'Filed by hand.' })]))).toBe(true)
  })

  test('behavior: an issue whose marker has no path is ignored', () => {
    const body = Github.renderBody({ body: 'Body.', marker: { hash: 'x' } })
    expect(Sync.empty(plan([], [issue({ body })]))).toBe(true)
  })

  test('behavior: an issue mirroring a file in another repository is ignored', () => {
    const body = Github.renderBody({
      body: 'Body.',
      marker: { hash: 'x', origin: 'acme/app', path: Store.toPath('a') },
    })
    expect(Sync.empty(plan([], [issue({ body })]))).toBe(true)
  })

  test('behavior: an entry linked to another repository is left alone', () => {
    expect(Sync.empty(plan([entry({ issue: 'wevm/viem#9' })], []))).toBe(true)
  })

  test('behavior: a malformed link is left alone', () => {
    expect(Sync.empty(plan([entry({ issue: 'nonsense' })], []))).toBe(true)
  })

  test('behavior: reconciles a mixed set in one pass', () => {
    const result = plan(
      [
        entry({ id: 'stays', issue: `${repo}#1` }),
        entry({ id: 'closed', issue: `${repo}#2` }),
        entry({ id: 'gone', issue: `${repo}#3` }),
        entry({ id: 'pending' }),
      ],
      [
        issue({ number: 1, body: bodyFor('stays') }),
        issue({ number: 2, body: bodyFor('closed'), state: 'closed' }),
        issue({ number: 4, body: bodyFor('reopened') }),
      ],
    )

    expect({
      cleared: result.clearLink.map((value) => value.id),
      remove: result.remove,
      write: result.write.map((value) => value.id),
    }).toMatchInlineSnapshot(`
      {
        "cleared": [
          "gone",
        ],
        "remove": [
          "closed",
        ],
        "write": [
          "reopened",
        ],
      }
    `)
  })
})

// Friction reported upstream: the issues are there, the files are here. `plan` is told both.
describe('plan across repositories', () => {
  const upstream = 'wevm/viem'

  /** An issue in `upstream` whose marker points at a file in this repository. */
  function upstreamIssue(overrides: Partial<Github.Issue> = {}): Github.Issue {
    return {
      body: Github.renderBody({
        body: 'Body.',
        marker: { hash: Github.hash('Filters ignored'), origin: repo, path: Store.toPath('a') },
      }),
      labels: ['friction', 'friction:minor'],
      number: 1,
      state: 'open',
      title: 'Filters ignored',
      ...overrides,
    }
  }

  function across(entries: readonly Entry.Entry[], issues: readonly Github.Issue[]): Sync.Plan {
    return Sync.plan({ entries, issues, labels, origin: repo, repo: upstream, severityLabels })
  }

  test('behavior: an upstream issue that closed removes the entry mirroring it', () => {
    const result = across(
      [entry({ issue: `${upstream}#1`, target: 'viem' })],
      [upstreamIssue({ state: 'closed' })],
    )
    expect(result.remove).toEqual(['a'])
  })

  // Without `origin`, the marker would be compared against the upstream repository and never match.
  test('behavior: an open upstream issue whose file was deleted is rebuilt here', () => {
    const result = across([], [upstreamIssue()])
    expect(result.write.map((value) => value.id)).toEqual(['a'])
    expect(result.write[0]?.issue).toBe(`${upstream}#1`)
  })

  test('behavior: an upstream issue mirroring a third repository is ignored', () => {
    const body = Github.renderBody({
      body: 'Body.',
      marker: { hash: 'x', origin: 'other/app', path: Store.toPath('a') },
    })
    expect(Sync.empty(across([], [upstreamIssue({ body })]))).toBe(true)
  })

  test('behavior: an entry linked to a different repository is left alone', () => {
    expect(Sync.empty(across([entry({ issue: 'third/party#9' })], [upstreamIssue()]))).toBe(true)
  })
})

function bodyFor(id: string): string {
  return Github.renderBody({
    body: 'Body.',
    marker: { hash: Github.hash('Filters ignored'), origin: repo, path: Store.toPath(id) },
  })
}

// Reconciliation runs on a schedule and on every issue event, so a second pass must be a no-op.
describe('idempotency', () => {
  /** Applies a plan to a local entry set, the way the CLI does. */
  function apply(entries: readonly Entry.Entry[], result: Sync.Plan): readonly Entry.Entry[] {
    const removed = new Set(result.remove)
    const replaced = new Map(
      [...result.write, ...result.clearLink].map((value) => [value.id, value]),
    )
    const kept = entries
      .filter((value) => !removed.has(value.id))
      .map((value) => replaced.get(value.id) ?? value)
    const added = [...replaced.values()].filter(
      (value) => !entries.some((existing) => existing.id === value.id),
    )
    return [...kept, ...added]
  }

  const cases = [
    {
      entries: [entry({ issue: `${repo}#1` })],
      issues: [issue({ state: 'closed' })],
      name: 'closed issue',
    },
    { entries: [entry({ issue: `${repo}#1` })], issues: [], name: 'missing issue' },
    {
      entries: [entry({ issue: `${repo}#1` })],
      issues: [issue({ title: 'Renamed' })],
      name: 'edited issue',
    },
    { entries: [], issues: [issue()], name: 'reopened issue' },
  ] as const

  test.for(cases)('behavior: a second pass over a $name changes nothing', ({ entries, issues }) => {
    const first = plan(entries, issues)
    expect(Sync.empty(first)).toBe(false)

    const second = plan(apply(entries, first), issues)
    expect(second).toEqual({ clearLink: [], remove: [], write: [] })
  })
})
