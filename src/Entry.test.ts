import * as Entry from './Entry.js'

const id = 'lazy-squids-chew'

describe('parse', () => {
  test('behavior: parses frontmatter and body', () => {
    expect(
      Entry.parse(
        `---
title: 'Filters are ignored'
severity: major
target: viem
labels:
  - dx
issue: 'wevm/viem#4821'
---

## Description

The filter was swallowed.
`,
        { id },
      ),
    ).toMatchInlineSnapshot(`
      {
        "body": "## Description

      The filter was swallowed.",
        "id": "lazy-squids-chew",
        "issue": "wevm/viem#4821",
        "labels": [
          "dx",
        ],
        "severity": "major",
        "target": "viem",
        "title": "Filters are ignored",
      }
    `)
  })

  test('behavior: defaults severity to minor', () => {
    expect(Entry.parse("---\ntitle: 'Slow'\n---\n\nBody.\n", { id }).severity).toBe('minor')
  })

  test('behavior: trims surrounding whitespace from the body', () => {
    expect(Entry.parse("---\ntitle: 'Slow'\n---\n\n\n  Body.\n\n\n", { id }).body).toBe('Body.')
  })

  test('behavior: tolerates an empty body', () => {
    expect(Entry.parse("---\ntitle: 'Slow'\n---\n", { id }).body).toBe('')
  })

  test('error: no frontmatter block', () => {
    expect(() => Entry.parse('# Just markdown\n', { id })).toThrowErrorMatchingInlineSnapshot(
      `[Entry.MalformedError: Entry \`lazy-squids-chew\` has no valid YAML frontmatter block.]`,
    )
  })

  test('error: unparseable yaml', () => {
    expect(() =>
      Entry.parse("---\ntitle: 'unterminated\n---\n\nBody.\n", { id }),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Entry.MalformedError: Entry \`lazy-squids-chew\` has no valid YAML frontmatter block.]`,
    )
  })

  test('error: missing title', () => {
    expect(() =>
      Entry.parse('---\nseverity: major\n---\n\nBody.\n', { id }),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Entry.InvalidError: Entry \`lazy-squids-chew\` has invalid frontmatter. title: Invalid input: expected string, received undefined]`,
    )
  })

  test('error: unknown severity', () => {
    expect(() =>
      Entry.parse("---\ntitle: 'Slow'\nseverity: catastrophic\n---\n\nBody.\n", { id }),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Entry.InvalidError: Entry \`lazy-squids-chew\` has invalid frontmatter. severity: Invalid option: expected one of "blocker"|"major"|"minor"]`,
    )
  })

  test('error: malformed issue link', () => {
    expect(() =>
      Entry.parse("---\ntitle: 'Slow'\nissue: 'viem#4821'\n---\n\nBody.\n", { id }),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Entry.InvalidError: Entry \`lazy-squids-chew\` has invalid frontmatter. issue: Invalid string: must match pattern /^[\\w.-]+\\/[\\w.-]+#\\d+$/]`,
    )
  })
})

describe('serialize', () => {
  test('behavior: quotes values and omits absent fields', () => {
    expect(
      Entry.serialize({
        body: 'The filter was swallowed.',
        severity: 'minor',
        title: 'Filters are ignored',
      }),
    ).toMatchInlineSnapshot(`
      "---
      title: 'Filters are ignored'
      severity: 'minor'
      ---

      The filter was swallowed.
      "
    `)
  })

  test('behavior: writes every present field in reading order', () => {
    expect(
      Entry.serialize({
        body: 'Body.',
        issue: 'wevm/viem#4821',
        labels: ['dx', 'docs'],
        severity: 'blocker',
        target: 'viem',
        title: 'Filters are ignored',
      }),
    ).toMatchInlineSnapshot(`
      "---
      title: 'Filters are ignored'
      severity: 'blocker'
      target: 'viem'
      labels:
        - 'dx'
        - 'docs'
      issue: 'wevm/viem#4821'
      ---

      Body.
      "
    `)
  })

  test('behavior: drops an empty labels array', () => {
    expect(
      Entry.serialize({ body: 'Body.', labels: [], severity: 'minor', title: 'Slow' }),
    ).not.toContain('labels')
  })
})

describe('round trip', () => {
  // The reopen edge of sync rebuilds a file from its issue, so this property is load-bearing.
  const cases = [
    { body: 'Body.', severity: 'minor', title: 'Plain' },
    { body: 'Body.', severity: 'major', title: '`pnpm test -- <files>` ignores filters: really' },
    { body: 'Body.', severity: 'blocker', title: "it's a problem, isn't it" },
    { body: 'Body.', severity: 'minor', title: '@scope/pkg: 100% broken #1 @ 3:00' },
    { body: 'Body.', severity: 'minor', title: 'no: yes, true, null, ~, 0x1' },
    { body: 'Body.', severity: 'minor', title: 'emoji 🎉 and — dashes' },
    {
      body: '## Description\n\nMulti\n\nline\n\n```ts\nconst a = 1\n```',
      issue: 'wevm/viem#4821',
      labels: ["it's", 'a-b.c'],
      severity: 'blocker',
      target: '@scope/pkg',
      title: 'everything at once',
    },
  ] as const satisfies readonly Entry.serialize.Options[]

  test.for(cases)('behavior: parse(serialize(x)) === x for %o', (entry) => {
    expect(Entry.parse(Entry.serialize(entry), { id })).toEqual({
      ...entry,
      id,
    })
  })
})

describe('newId', () => {
  test('behavior: timestamps the entry and carries the title', () => {
    expect(
      Entry.newId({
        date: new Date(2026, 6, 25, 14, 30, 12),
        title: '`pnpm test -- <files>` ignores file filters',
      }),
    ).toMatchInlineSnapshot(`"20260725143012-pnpm-test-files"`)
  })

  test('behavior: pads every single-digit field', () => {
    expect(
      Entry.newId({ date: new Date(2026, 0, 3, 4, 5, 6), title: 'Slow' }),
    ).toMatchInlineSnapshot(`"20260103040506-slow"`)
  })

  test('behavior: defaults to now', () => {
    const id = Entry.newId({ title: 'Slow' })

    // Parsed back rather than compared against a second rendering of the same logic, so a field in the
    // wrong position fails here instead of matching itself.
    const [, year, month, day, hour, minute, second] =
      /^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)-slow$/.exec(id) ?? []
    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    )
    expect(Math.abs(parsed.getTime() - Date.now())).toBeLessThan(5_000)
  })

  test('behavior: ids sort oldest first', () => {
    const ids = [
      Entry.newId({ date: new Date(2026, 6, 25, 14, 30, 12), title: 'Last' }),
      Entry.newId({ date: new Date(2026, 6, 25, 9, 12, 4), title: 'Third' }),
      Entry.newId({ date: new Date(2026, 0, 3, 4, 5, 6), title: 'Second' }),
      Entry.newId({ date: new Date(2025, 11, 31, 23, 59, 59), title: 'First' }),
    ]
    expect([...ids].sort()).toMatchInlineSnapshot(`
      [
        "20251231235959-first",
        "20260103040506-second",
        "20260725091204-third",
        "20260725143012-last",
      ]
    `)
  })
})

describe('slug', () => {
  test.for([
    ['`pnpm test` ignores filters', 'pnpm-test-ignores'],
    ['PNPM Test Ignores Filters.', 'pnpm-test-ignores'],
    ['  spaced   out  ', 'spaced-out'],
    ['@scope/pkg breaks', 'scope-pkg-breaks'],
    ['one', 'one'],
    ['!!!', 'friction'],
    ['', 'friction'],
  ] as const)('behavior: %s', ([title, expected]) => {
    expect(Entry.slug(title)).toBe(expected)
  })

  test('behavior: keeps the first three words of a long title', () => {
    expect(
      Entry.slug('the filter is swallowed before it reaches the runner and nothing warns'),
    ).toMatchInlineSnapshot(`"the-filter-is"`)
  })

  test('behavior: truncates a word longer than the length bound', () => {
    expect(Entry.slug('a'.repeat(60))).toBe('a'.repeat(48))
  })
})

describe('normalizeTitle', () => {
  test.for([
    ['`pnpm test` ignores filters', 'pnpm test ignores filters'],
    ['pnpm   test    ignores  filters!', 'pnpm test ignores filters'],
    ['PNPM Test Ignores Filters.', 'pnpm test ignores filters'],
    ['  pnpm-test ignores filters  ', 'pnpm test ignores filters'],
  ] as const)('behavior: %s', ([input, expected]) => {
    expect(Entry.normalizeTitle(input)).toBe(expected)
  })
})
