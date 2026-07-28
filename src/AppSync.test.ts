import * as AppSync from './AppSync.js'
import * as Entry from './Entry.js'
import type * as Mirrors from './Mirrors.js'
import * as Store from './Store.js'

const source = 'acme/source'
const target = 'wevm/viem'

function entry(overrides: Partial<Entry.Entry> = {}): Entry.Entry {
  return {
    body: 'The filter is ignored.',
    id: 'filters-ignored',
    severity: 'minor',
    title: 'Filters ignored',
    ...overrides,
  }
}

function occurrence(value: Entry.Entry): string {
  return AppSync.occurrence({ entry: value })
}

function report(
  value: Entry.Entry,
  overrides: Partial<AppSync.Report> = {},
): readonly [string, AppSync.Report] {
  return [
    occurrence(value),
    {
      number: 7,
      repo: target,
      state: 'open',
      ...overrides,
    },
  ]
}

function snapshot(
  values: readonly (readonly [string, AppSync.Report])[],
  overrides: Partial<AppSync.Snapshot> = {},
): AppSync.Snapshot {
  return {
    complete: true,
    reports: Object.fromEntries(values),
    repository: {
      fullName: source,
      id: 123,
      sha: 'ab'.repeat(20),
    },
    version: 1,
    ...overrides,
  }
}

function mirror(value: Entry.Entry): Mirrors.Mirror {
  const issue = value.issue ?? `${target}#7`
  const linked = { ...value, issue }
  return {
    contents: Entry.serialize(linked),
    issue,
    occurrence: occurrence(linked),
    path: Store.toPath(linked.id),
  }
}

describe('from', () => {
  test('behavior: validates and sorts a content-free snapshot', () => {
    const first = '11'.repeat(32)
    const second = '22'.repeat(32)
    expect(
      AppSync.from({
        complete: true,
        reports: {
          [second]: { number: 2, repo: 'acme/two', state: 'closed' },
          [first]: { number: 1, repo: 'acme/one', state: 'open' },
        },
        repository: { fullName: source, id: 123, sha: 'ab'.repeat(32) },
        version: 1,
      }),
    ).toEqual({
      complete: true,
      reports: {
        [first]: { number: 1, repo: 'acme/one', state: 'open' },
        [second]: { number: 2, repo: 'acme/two', state: 'closed' },
      },
      repository: { fullName: source, id: 123, sha: 'ab'.repeat(32) },
      version: 1,
    })
  })

  test.each([
    ['top-level field', { ...snapshot([]), command: 'write .env' }],
    [
      'repository field',
      { ...snapshot([]), repository: { ...snapshot([]).repository, path: '.github/workflows' } },
    ],
    [
      'report field',
      snapshot([
        [
          '11'.repeat(32),
          { body: 'remote contents', number: 1, repo: target, state: 'open' } as never,
        ],
      ]),
    ],
    ['version', { ...snapshot([]), version: 2 }],
    ['completion', { ...snapshot([]), complete: 'yes' }],
    ['repository id', { ...snapshot([]), repository: { ...snapshot([]).repository, id: 0 } }],
    [
      'repository name',
      { ...snapshot([]), repository: { ...snapshot([]).repository, fullName: 'invalid' } },
    ],
    ['repository sha', { ...snapshot([]), repository: { ...snapshot([]).repository, sha: 'ABC' } }],
    ['occurrence', snapshot([['short', { number: 1, repo: target, state: 'open' }]])],
    ['issue number', snapshot([['11'.repeat(32), { number: -1, repo: target, state: 'open' }]])],
    [
      'issue repository',
      snapshot([['11'.repeat(32), { number: 1, repo: 'invalid', state: 'open' }]]),
    ],
    [
      'issue state',
      snapshot([['11'.repeat(32), { number: 1, repo: target, state: 'unknown' as never }]]),
    ],
  ])('error: rejects an invalid %s', (_, value) => {
    expect(() => AppSync.from(value)).toThrow(AppSync.InvalidError)
  })

  test('behavior: serializes equivalent report maps deterministically', () => {
    const a = report(entry({ id: 'a' }))
    const b = report(entry({ id: 'b' }), { number: 8 })
    expect(AppSync.serialize(snapshot([b, a]))).toBe(AppSync.serialize(snapshot([a, b])))
  })
})

describe('occurrence', () => {
  test('behavior: produces the App occurrence marker digest', () => {
    expect(occurrence(entry())).toMatch(/^[0-9a-f]{64}$/)
  })

  test('behavior: survives repository renames and changes with id or body', () => {
    const value = entry()
    expect(occurrence(entry({ id: 'other' }))).not.toBe(occurrence(value))
    expect(occurrence(entry({ body: 'Changed.' }))).not.toBe(occurrence(value))
    expect(occurrence(entry({ issue: `${target}#7` }))).toBe(occurrence(value))
  })
})

describe('plan', () => {
  test('behavior: links an open report without accepting remote contents or paths', () => {
    const value = entry()
    const result = AppSync.plan(snapshot([report(value)]), { entries: [value] })
    expect(result.write).toEqual([{ ...value, issue: `${target}#7` }])
    expect(result.remove).toEqual([])
    expect(result.remember).toEqual([])
  })

  test('behavior: leaves an already linked open report unchanged', () => {
    const value = entry({ issue: `${target}#7` })
    expect(AppSync.empty(AppSync.plan(snapshot([report(value)]), { entries: [value] }))).toBe(true)
  })

  test('behavior: removes a closed report after capturing repository-owned contents', () => {
    const value = entry({ issue: `${target}#7` })
    const result = AppSync.plan(snapshot([report(value, { state: 'closed' })]), {
      entries: [value],
    })
    expect(result.remove).toEqual([value.id])
    expect(result.remember).toEqual([mirror(value)])
    expect(result.write).toEqual([])
  })

  test('behavior: captures the App issue link before removing a pending closed report', () => {
    const value = entry()
    const result = AppSync.plan(snapshot([report(value, { state: 'closed' })]), {
      entries: [value],
    })
    expect(result.remember).toEqual([mirror(value)])
    expect(result.remove).toEqual([value.id])
  })

  test('behavior: clears a linked entry whose issue is explicitly missing', () => {
    const value = entry({ issue: `${target}#7` })
    const result = AppSync.plan(snapshot([report(value, { state: 'missing' })]), {
      entries: [value],
    })
    expect(result.clearLink).toEqual([entry()])
    expect(result.clearLink[0]).not.toHaveProperty('issue')
  })

  test('behavior: leaves a pending entry pending when its former issue is missing', () => {
    const value = entry()
    expect(
      AppSync.empty(
        AppSync.plan(snapshot([report(value, { state: 'missing' })]), { entries: [value] }),
      ),
    ).toBe(true)
  })

  test('behavior: restores a reopened report only from its repository-owned snapshot', () => {
    const value = entry({ issue: `${target}#7`, labels: ['tooling'], severity: 'major' })
    const captured = mirror(value)
    const result = AppSync.plan(snapshot([report(value)]), {
      entries: [],
      mirrors: [captured],
    })
    expect(result.write).toEqual([value])
    expect(result.forget).toEqual([captured])
  })

  test('error: a complete snapshot cannot restore an open legacy path-only mirror', () => {
    const value = entry({ issue: `${target}#7` })
    const legacy = { issue: value.issue as string, path: Store.toPath(value.id) }
    const state = [
      [
        AppSync.legacyOccurrence(legacy.issue),
        { number: 7, repo: target, state: 'open' as const },
      ] as const,
    ]
    expect(() => AppSync.plan(snapshot(state), { entries: [], mirrors: [legacy] })).toThrow(
      AppSync.PlanError,
    )
    expect(
      AppSync.empty(
        AppSync.plan(snapshot(state, { complete: false }), {
          entries: [],
          mirrors: [legacy],
        }),
      ),
    ).toBe(true)
  })

  test('behavior: a reopened stale mirror never overwrites a newer report at the same path', () => {
    const old = entry({ issue: `${target}#7` })
    const current = entry({ body: 'Current repository-owned report.' })
    const captured = mirror(old)
    const result = AppSync.plan(snapshot([report(old)]), {
      entries: [current],
      mirrors: [captured],
    })

    expect(result.write).toEqual([])
    expect(result.forget).toEqual([captured])
  })

  test('behavior: captured mirror occurrences survive a repository rename', () => {
    const value = entry({ issue: `${target}#7` })
    const captured = mirror(value)
    const renamed = snapshot([report(value)], {
      repository: {
        fullName: 'acme/renamed',
        id: 123,
        sha: 'ab'.repeat(20),
      },
    })

    expect(
      AppSync.plan(renamed, {
        entries: [],
        mirrors: [captured],
      }).write,
    ).toEqual([value])
  })

  test('behavior: keeps closed mirrors and forgets explicitly missing mirrors', () => {
    const closed = entry({ id: 'closed', issue: `${target}#7` })
    const missing = entry({ id: 'missing', issue: `${target}#8` })
    const legacy = { issue: `${target}#9`, path: Store.toPath('legacy') }
    const reports = [
      report(closed, { state: 'closed' }),
      report(missing, { number: 8, state: 'missing' }),
      [
        AppSync.legacyOccurrence(legacy.issue),
        { number: 9, repo: target, state: 'missing' as const },
      ] as const,
    ]
    const closedMirror = mirror(closed)
    const missingMirror = mirror(missing)
    const result = AppSync.plan(snapshot(reports), {
      entries: [],
      mirrors: [closedMirror, missingMirror, legacy],
    })
    expect(result.forget).toEqual([missingMirror, legacy])
    expect(result.write).toEqual([])
  })

  test('behavior: an incomplete snapshot applies opens but defers destructive changes', () => {
    const pending = entry({ id: 'pending' })
    const closed = entry({ id: 'closed', issue: `${target}#8` })
    const missing = entry({ id: 'missing', issue: `${target}#9` })
    const captured = mirror(entry({ id: 'reopened', issue: `${target}#10` }))
    const reports = [
      report(pending),
      report(closed, { number: 8, state: 'closed' }),
      report(missing, { number: 9, state: 'missing' }),
      report(entry({ id: 'reopened' }), { number: 10 }),
    ]
    const result = AppSync.plan(snapshot(reports, { complete: false }), {
      entries: [pending, closed, missing],
      mirrors: [captured],
    })
    expect(result.write.map((value) => value.id)).toEqual(['pending', 'reopened'])
    expect(result.clearLink).toEqual([])
    expect(result.forget).toEqual([])
    expect(result.remember).toEqual([])
    expect(result.remove).toEqual([])
  })

  test('behavior: a complete snapshot may omit pending unlinked entries', () => {
    expect(AppSync.empty(AppSync.plan(snapshot([]), { entries: [entry()] }))).toBe(true)
  })

  test('error: a complete snapshot must cover every linked entry', () => {
    expect(() =>
      AppSync.plan(snapshot([]), { entries: [entry({ issue: `${target}#7` })] }),
    ).toThrow(AppSync.PlanError)
  })

  test('error: a complete snapshot must cover every mirror exactly once', () => {
    const legacy = { issue: `${target}#7`, path: Store.toPath('legacy') }
    expect(() => AppSync.plan(snapshot([]), { entries: [], mirrors: [legacy] })).toThrow(
      AppSync.PlanError,
    )

    expect(() =>
      AppSync.plan(
        snapshot([
          ['11'.repeat(32), { number: 7, repo: target, state: 'closed' }],
          ['22'.repeat(32), { number: 7, repo: target, state: 'closed' }],
        ]),
        { entries: [], mirrors: [legacy] },
      ),
    ).toThrow(AppSync.PlanError)
  })

  test('error: a complete snapshot rejects reports with no local entry or mirror', () => {
    expect(() =>
      AppSync.plan(snapshot([['11'.repeat(32), { number: 1, repo: target, state: 'open' }]]), {
        entries: [],
      }),
    ).toThrow(AppSync.PlanError)
  })

  test('error: a report cannot replace an existing issue binding', () => {
    const value = entry({ issue: 'acme/other#1' })
    expect(() => AppSync.plan(snapshot([report(value)]), { entries: [value] })).toThrow(
      AppSync.PlanError,
    )
  })

  test('error: a mirror occurrence must match its repository-owned contents', () => {
    const value = entry({ issue: `${target}#7` })
    const captured = { ...mirror(value), occurrence: 'ff'.repeat(32) }
    expect(() =>
      AppSync.plan(snapshot([report(value)]), { entries: [], mirrors: [captured] }),
    ).toThrow(AppSync.PlanError)
  })
})
