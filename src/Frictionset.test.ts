import * as Frictionset from './Frictionset.js'

const id = 'lazy-squids-chew'

describe('parse', () => {
  test('behavior: parses frontmatter and body', () => {
    expect(
      Frictionset.parse(
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
    expect(Frictionset.parse("---\ntitle: 'Slow'\n---\n\nBody.\n", { id }).severity).toBe('minor')
  })

  test('behavior: trims surrounding whitespace from the body', () => {
    expect(Frictionset.parse("---\ntitle: 'Slow'\n---\n\n\n  Body.\n\n\n", { id }).body).toBe(
      'Body.',
    )
  })

  test('behavior: tolerates an empty body', () => {
    expect(Frictionset.parse("---\ntitle: 'Slow'\n---\n", { id }).body).toBe('')
  })

  test('error: no frontmatter block', () => {
    expect(() => Frictionset.parse('# Just markdown\n', { id })).toThrowErrorMatchingInlineSnapshot(
      `[Frictionset.MalformedError: Frictionset \`lazy-squids-chew\` has no valid YAML frontmatter block.]`,
    )
  })

  test('error: unparseable yaml', () => {
    expect(() =>
      Frictionset.parse("---\ntitle: 'unterminated\n---\n\nBody.\n", { id }),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Frictionset.MalformedError: Frictionset \`lazy-squids-chew\` has no valid YAML frontmatter block.]`,
    )
  })

  test('error: missing title', () => {
    expect(() =>
      Frictionset.parse('---\nseverity: major\n---\n\nBody.\n', { id }),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Frictionset.InvalidError: Frictionset \`lazy-squids-chew\` has invalid frontmatter. title: Invalid input: expected string, received undefined]`,
    )
  })

  test('error: unknown severity', () => {
    expect(() =>
      Frictionset.parse("---\ntitle: 'Slow'\nseverity: catastrophic\n---\n\nBody.\n", { id }),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Frictionset.InvalidError: Frictionset \`lazy-squids-chew\` has invalid frontmatter. severity: Invalid option: expected one of "blocker"|"major"|"minor"]`,
    )
  })

  test('error: malformed issue link', () => {
    expect(() =>
      Frictionset.parse("---\ntitle: 'Slow'\nissue: 'viem#4821'\n---\n\nBody.\n", { id }),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Frictionset.InvalidError: Frictionset \`lazy-squids-chew\` has invalid frontmatter. issue: Invalid string: must match pattern /^[\\w.-]+\\/[\\w.-]+#\\d+$/]`,
    )
  })
})

describe('serialize', () => {
  test('behavior: quotes values and omits absent fields', () => {
    expect(
      Frictionset.serialize({
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
      Frictionset.serialize({
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
      Frictionset.serialize({ body: 'Body.', labels: [], severity: 'minor', title: 'Slow' }),
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
  ] as const satisfies readonly Frictionset.serialize.Options[]

  test.for(cases)('behavior: parse(serialize(x)) === x for %o', (frictionset) => {
    expect(Frictionset.parse(Frictionset.serialize(frictionset), { id })).toEqual({
      ...frictionset,
      id,
    })
  })
})

describe('newId', () => {
  test('behavior: mints a hyphenated lowercase id', () => {
    expect(Frictionset.newId()).toMatch(/^[a-z]+(-[a-z]+)+$/)
  })

  test('behavior: ids do not collide across a batch', () => {
    const ids = new Set(Array.from({ length: 200 }, () => Frictionset.newId()))
    expect(ids.size).toBeGreaterThan(190)
  })
})

describe('normalizeTitle', () => {
  test.for([
    ['`pnpm test` ignores filters', 'pnpm test ignores filters'],
    ['pnpm   test    ignores  filters!', 'pnpm test ignores filters'],
    ['PNPM Test Ignores Filters.', 'pnpm test ignores filters'],
    ['  pnpm-test ignores filters  ', 'pnpm test ignores filters'],
  ] as const)('behavior: %s', ([input, expected]) => {
    expect(Frictionset.normalizeTitle(input)).toBe(expected)
  })
})
