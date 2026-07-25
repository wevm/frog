import { Octokit } from '@octokit/rest'
import { github } from '../test/github.js'
import * as Github from './Github.js'

const repo = 'wevm/viem'
const title = '`pnpm test -- <files>` ignores file filters'

function client(url: string): Github.Client {
  return new Octokit({ auth: 'token', baseUrl: url }).rest
}

describe('split', () => {
  test('behavior: splits owner and name', () => {
    expect(Github.split('wevm/viem')).toEqual({ owner: 'wevm', repo: 'viem' })
  })
})

describe('hash', () => {
  // Pinned deliberately. If this value changes, every marker on every already-published issue stops
  // matching and dedupe silently starts opening duplicates.
  test('behavior: is stable', () => {
    expect(Github.hash(title)).toMatchInlineSnapshot(`"5cb3f123c0ec"`)
  })

  test('behavior: collapses case and punctuation differences', () => {
    expect(Github.hash('pnpm test ignores filters')).toBe(
      Github.hash('  PNPM   Test, ignores filters!  '),
    )
  })

  test('behavior: distinguishes genuinely different titles', () => {
    expect(Github.hash('pnpm test ignores filters')).not.toBe(
      Github.hash('pnpm build ignores filters'),
    )
  })
})

describe('marker', () => {
  test('behavior: round trips every field', () => {
    const marker = {
      hash: 'a3f9c1e20b47',
      origin: 'acme/app',
      path: '.agents/frictionsets/lazy-squids-chew.md',
    }
    expect(Github.renderMarker(marker)).toMatchInlineSnapshot(
      `"<!-- frictionsets:v1 hash=a3f9c1e20b47 path=.agents/frictionsets/lazy-squids-chew.md origin=acme/app -->"`,
    )
    expect(Github.parseMarker(Github.renderMarker(marker))).toEqual(marker)
  })

  test('behavior: round trips a hash on its own', () => {
    expect(Github.parseMarker(Github.renderMarker({ hash: 'abc123' }))).toEqual({ hash: 'abc123' })
  })

  test.for([
    ['', undefined],
    [null, undefined],
    ['no marker here', undefined],
    ['<!-- frictionsets:v1 -->', undefined],
    ['<!-- frictionsets:v1 path=a.md -->', undefined],
    ['<!-- other:v1 hash=abc -->', undefined],
  ] as const)('behavior: %s yields no marker', ([body]) => {
    expect(Github.parseMarker(body)).toBeUndefined()
  })
})

describe('renderBody and parseBody', () => {
  test('behavior: renders body, marker, and provenance', () => {
    expect(
      Github.renderBody({
        body: '## Description\n\nThe filter was swallowed.',
        marker: { hash: 'abc123', origin: 'acme/app', path: '.agents/frictionsets/one.md' },
        provenance: { author: 'Test User', pr: 'acme/app#42', sha: '0123456789abcdef' },
      }),
    ).toMatchInlineSnapshot(`
      "## Description

      The filter was swallowed.

      <!-- frictionsets:v1 hash=abc123 path=.agents/frictionsets/one.md origin=acme/app -->

      ---

      <sub>Logged by Test User in \`acme/app\` at \`0123456\` via acme/app#42. Filed by [frictionsets](https://github.com/wevm/frictionsets).</sub>
      "
    `)
  })

  test('behavior: renders without provenance', () => {
    expect(Github.renderBody({ body: 'Body.', marker: { hash: 'abc123' } })).toMatchInlineSnapshot(`
      "Body.

      <!-- frictionsets:v1 hash=abc123 -->

      ---

      <sub>Logged. Filed by [frictionsets](https://github.com/wevm/frictionsets).</sub>
      "
    `)
  })

  // The reopen edge of sync rebuilds a file from its issue, so this inverse must hold exactly.
  test.for([
    'Body.',
    '## Description\n\nMulti\n\nline',
    '## Description\n\n```md\n<!-- a comment that is not the marker -->\n```',
    '## Description\n\n---\n\nA horizontal rule in the body.',
    'Trailing whitespace and blank lines',
  ])('behavior: parseBody(renderBody(%j)) === body', (body) => {
    const rendered = Github.renderBody({
      body,
      marker: { hash: 'abc123', origin: 'acme/app', path: 'a.md' },
      provenance: { author: 'Test User', sha: 'deadbeefcafe' },
    })
    expect(Github.parseBody(rendered)).toBe(body)
  })

  test('behavior: a body with no marker is returned as-is', () => {
    expect(Github.parseBody('Hand-written issue.')).toBe('Hand-written issue.')
  })
})

describe('toLabels', () => {
  const severityLabels = {
    blocker: 'friction:blocker',
    major: 'friction:major',
    minor: 'friction:minor',
  }

  test('behavior: combines configured, severity, and entry labels', () => {
    expect(
      Github.toLabels({
        frictionset: { labels: ['tooling'], severity: 'blocker' },
        labels: ['friction'],
        severityLabels,
      }),
    ).toEqual(['friction', 'friction:blocker', 'tooling'])
  })

  test('behavior: deduplicates', () => {
    expect(
      Github.toLabels({
        frictionset: { labels: ['friction', 'friction:minor'], severity: 'minor' },
        labels: ['friction'],
        severityLabels,
      }),
    ).toEqual(['friction', 'friction:minor'])
  })
})

describe('parseLink', () => {
  test('behavior: inverts toLink', () => {
    expect(Github.parseLink(Github.toLink({ issue: 4821, repo }))).toEqual({
      issue: 4821,
      repo,
    })
  })

  test.for(['viem#1', 'wevm/viem', 'wevm/viem#', 'wevm/viem#abc', '', 'nonsense'] as const)(
    'behavior: %s is not a link',
    (link) => {
      expect(Github.parseLink(link)).toBeUndefined()
    },
  )
})

describe('toLabelNames', () => {
  test('behavior: flattens both representations and drops the unnamed', () => {
    expect(
      Github.toLabelNames({
        labels: ['friction', { name: 'tooling' }, { name: undefined }],
        number: 1,
        state: 'open',
        title,
      }),
    ).toEqual(['friction', 'tooling'])
  })

  test('behavior: an issue with no labels yields nothing', () => {
    expect(Github.toLabelNames({ number: 1, state: 'open', title })).toEqual([])
  })
})

describe('fromIssue', () => {
  const options = {
    id: 'a',
    labels: ['friction'],
    repo,
    severityLabels: {
      blocker: 'friction:blocker',
      major: 'friction:major',
      minor: 'friction:minor',
    },
  } as const

  test('behavior: recovers body, severity, and extra labels', () => {
    const issue = {
      body: Github.renderBody({ body: 'The filter was swallowed.', marker: { hash: 'x' } }),
      labels: ['friction', 'friction:blocker', 'tooling'],
      number: 7,
      state: 'open',
      title,
    }

    expect(Github.fromIssue(issue, options)).toEqual({
      body: 'The filter was swallowed.',
      id: 'a',
      issue: `${repo}#7`,
      labels: ['tooling'],
      severity: 'blocker',
      title,
    })
  })

  test('behavior: defaults severity when no severity label is present', () => {
    const issue = { body: 'Body.', labels: ['friction'], number: 1, state: 'open', title }
    expect(Github.fromIssue(issue, options).severity).toBe('minor')
  })

  test('behavior: omits labels when only managed ones remain', () => {
    const issue = {
      body: 'Body.',
      labels: ['friction', 'friction:major'],
      number: 1,
      state: 'open',
      title,
    }
    expect(Github.fromIssue(issue, options)).not.toHaveProperty('labels')
  })
})

describe('get', () => {
  test('behavior: returns the issue', async () => {
    const instance = await github({ [repo]: [{ title }] })
    expect((await Github.get(client(instance.url), { issue: 1, repo }))?.title).toBe(title)
  })

  test('behavior: undefined for an issue that does not exist', async () => {
    const instance = await github()
    expect(await Github.get(client(instance.url), { issue: 99, repo })).toBeUndefined()
  })

  test('behavior: finds an issue the label listing would miss', async () => {
    const instance = await github({ [repo]: [{ labels: ['triage'], title }] })

    expect(await Github.list(client(instance.url), { label: 'friction', repo })).toEqual([])
    expect((await Github.get(client(instance.url), { issue: 1, repo }))?.title).toBe(title)
  })
})

describe('permissions', () => {
  test('behavior: reports push access', async () => {
    const instance = await github()
    expect(await Github.permissions(client(instance.url), { repo })).toEqual({ push: true })
  })

  test('behavior: reports the absence of push access', async () => {
    const instance = await github({}, { pushAccess: [] })
    expect(await Github.permissions(client(instance.url), { repo })).toEqual({ push: false })
  })

  test('behavior: an unreadable repository reports no push access', async () => {
    const instance = await github({}, { errors: { [repo]: 404 } })
    expect(await Github.permissions(client(instance.url), { repo })).toEqual({ push: false })
  })
})

describe('find', () => {
  test('behavior: finds an unlabelled issue by its marker', async () => {
    const instance = await github({
      [repo]: [
        { body: Github.renderMarker({ hash: Github.hash(title) }), labels: [], title: 'Anything' },
      ],
    })

    // Deliberately a title the search would not match, so only the marker can identify it.
    const found = await Github.find(client(instance.url), {
      hash: Github.hash(title),
      repo,
      title: 'Anything',
    })
    expect(found?.number).toBe(1)
  })

  test('behavior: finds an unlabelled issue whose title normalizes the same', async () => {
    const instance = await github({ [repo]: [{ body: 'Filed by hand.', labels: [], title }] })

    const found = await Github.find(client(instance.url), {
      hash: Github.hash(`  ${title.toUpperCase()}!  `),
      repo,
      title: `  ${title.toUpperCase()}!  `,
    })
    expect(found?.number).toBe(1)
  })

  test('behavior: undefined when nothing covers the friction', async () => {
    const instance = await github({ [repo]: [{ labels: [], title: 'Unrelated' }] })
    expect(
      await Github.find(client(instance.url), { hash: Github.hash(title), repo, title }),
    ).toBeUndefined()
  })

  test('behavior: ignores a pull request with a matching title', async () => {
    const instance = await github({ [repo]: [{ labels: [], pull: true, title }] })
    expect(
      await Github.find(client(instance.url), { hash: Github.hash(title), repo, title }),
    ).toBeUndefined()
  })
})

describe('index', () => {
  test('behavior: indexes by marker hash', async () => {
    const instance = await github({
      [repo]: [{ body: Github.renderMarker({ hash: 'known' }), title: 'Anything' }],
    })

    const indexed = await Github.index(client(instance.url), { label: 'friction', repo })
    expect([...indexed.keys()]).toEqual(['known'])
    expect(indexed.get('known')?.number).toBe(1)
  })

  test('behavior: falls back to the title hash for a hand-filed issue', async () => {
    const instance = await github({ [repo]: [{ title }] })

    const indexed = await Github.index(client(instance.url), { label: 'friction', repo })
    expect(indexed.get(Github.hash(title))?.title).toBe(title)
  })

  test('behavior: skips pull requests', async () => {
    const instance = await github({
      [repo]: [{ pull: true, title: 'A pull request' }, { title }],
    })

    const indexed = await Github.index(client(instance.url), { label: 'friction', repo })
    expect([...indexed.values()].map((issue) => issue.title)).toEqual([title])
  })

  test('behavior: ignores issues without the label', async () => {
    const instance = await github({
      [repo]: [{ labels: ['bug'], title: 'Unrelated' }, { title }],
    })

    const indexed = await Github.index(client(instance.url), { label: 'friction', repo })
    expect([...indexed.values()].map((issue) => issue.title)).toEqual([title])
  })

  test('behavior: prefers an open issue over a closed one', async () => {
    const marker = Github.renderMarker({ hash: 'known' })
    const instance = await github({
      [repo]: [
        { body: marker, state: 'closed', title: 'Closed one' },
        { body: marker, state: 'open', title: 'Open one' },
      ],
    })

    const indexed = await Github.index(client(instance.url), { label: 'friction', repo })
    expect(indexed.get('known')?.title).toBe('Open one')
  })

  test('behavior: paginates past the first page', async () => {
    const seeded = Array.from({ length: 150 }, (_, index) => ({
      body: Github.renderMarker({ hash: `hash${index}` }),
      title: `Friction ${index}`,
    }))
    const instance = await github({ [repo]: seeded })

    const indexed = await Github.index(client(instance.url), { label: 'friction', repo })
    expect(indexed.size).toBe(150)
    expect(instance.requests.filter((request) => request.method === 'GET')).toHaveLength(2)
  })

  test('behavior: an empty repository indexes to nothing', async () => {
    const instance = await github()
    expect((await Github.index(client(instance.url), { label: 'friction', repo })).size).toBe(0)
  })
})

describe('publish', () => {
  const frictionset = { body: '## Description\n\nThe filter was swallowed.', title }

  test('behavior: creates an issue with labels and a marker', async () => {
    const instance = await github()

    const result = await Github.publish(client(instance.url), {
      frictionset,
      labels: ['friction', 'friction:minor'],
      marker: { hash: Github.hash(title), origin: 'acme/app', path: 'a.md' },
      provenance: { author: 'Test User', sha: 'deadbeefcafe' },
      repo,
    })

    expect(result).toEqual({ issue: 1, status: 'created' })

    const created = instance.issues.get(repo)?.[0]
    expect(created?.title).toBe(title)
    expect(created?.labels).toEqual(['friction', 'friction:minor'])
    expect(Github.parseMarker(created?.body)).toEqual({
      hash: Github.hash(title),
      origin: 'acme/app',
      path: 'a.md',
    })
    expect(Github.parseBody(created?.body)).toBe(frictionset.body)
  })

  test('behavior: comments instead of opening a duplicate', async () => {
    const instance = await github({
      [repo]: [{ body: Github.renderMarker({ hash: Github.hash(title) }), title: 'Already filed' }],
    })
    const octokit = client(instance.url)

    const existing = (await Github.index(octokit, { label: 'friction', repo })).get(
      Github.hash(title),
    )
    const result = await Github.publish(octokit, {
      frictionset,
      labels: ['friction'],
      marker: { hash: Github.hash(title) },
      provenance: { author: 'Test User', pr: 'acme/app#42' },
      repo,
      ...(existing ? { existing } : {}),
    })

    expect(result).toEqual({ issue: 1, status: 'commented' })
    expect(instance.issues.get(repo)).toHaveLength(1)
    expect(instance.comments(repo, 1)).toMatchInlineSnapshot(`
      [
        "Hit again by Test User via acme/app#42.

      ## Description

      The filter was swallowed.
      ",
      ]
    `)
  })

  test('behavior: publishing twice through the index never duplicates', async () => {
    const instance = await github()
    const octokit = client(instance.url)

    for (const pass of [1, 2]) {
      const indexed = await Github.index(octokit, { label: 'friction', repo })
      const existing = indexed.get(Github.hash(title))
      const result = await Github.publish(octokit, {
        frictionset,
        labels: ['friction'],
        marker: { hash: Github.hash(title) },
        repo,
        ...(existing ? { existing } : {}),
      })
      expect(result.status).toBe(pass === 1 ? 'created' : 'commented')
    }

    expect(instance.issues.get(repo)).toHaveLength(1)
  })
})
