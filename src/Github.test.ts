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

describe('parseRepository', () => {
  // Every shape below was taken from a real `repository` field or git remote, not invented.
  test.for([
    ['git+https://github.com/wevm/viem.git', 'wevm/viem'],
    ['https://github.com/wevm/viem', 'wevm/viem'],
    ['git@github.com:wevm/viem.git', 'wevm/viem'],
    ['ssh://git@github.com/wevm/viem.git', 'wevm/viem'],
    ['git://github.com/wevm/viem.git', 'wevm/viem'],
    ['https://github.com:443/wevm/viem', 'wevm/viem'],
    // A monorepo package pointing at its own subdirectory rather than the repository root.
    ['https://github.com/changesets/changesets/tree/main/packages/config', 'changesets/changesets'],
    ['github:eemeli/yaml', 'eemeli/yaml'],
    ['lydell/js-tokens', 'lydell/js-tokens'],
    // Only GitHub resolves: an issue cannot be filed anywhere else.
    ['https://notgithub.com/foo/bar', undefined],
    ['https://example.com/github.com/foo/bar', undefined],
    ['https://gitlab.com/foo/bar.git', undefined],
    ['https://bitbucket.org/foo/bar', undefined],
    ['not a repository', undefined],
    ['', undefined],
    [undefined, undefined],
  ] as const)('behavior: %s', ([value, expected]) => {
    expect(Github.parseRepository(value)).toBe(expected)
  })

  test('behavior: npm shorthand can be disabled for git remotes', () => {
    expect(Github.parseRepository('wevm/viem', { shorthand: false })).toBeUndefined()
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

describe('occurrence', () => {
  // Pinned deliberately. The App and CLI hash this exact value, so changing its bytes would make a
  // repository running both modes report the same entry twice.
  test('behavior: is stable', () => {
    expect(
      Github.occurrence({
        entry: {
          body: 'Body:\n\nunchanged.',
          id: 'entry-a',
          severity: 'minor',
          title: 'A friction',
        },
        origin: 'acme/app',
      }),
    ).toBe('acme/app:entry-a:Body:\n\nunchanged.')
  })
})

describe('fetchFile', () => {
  test('behavior: existing narrow clients still read inline Contents payloads', async () => {
    const path = '.agents/friction-log/config.json'
    const contents = '{}\n'
    const instance = await github({}, { files: { [repo]: { [path]: contents } } })
    const complete = client(instance.url)
    const narrow: Github.Client = { issues: complete.issues, repos: complete.repos }

    await expect(Github.fetchFile(narrow, { path, repo })).resolves.toBe(contents)
  })

  test('behavior: falls back to the Git Blobs API when Contents omits a large payload', async () => {
    const path = '.agents/friction-log/.sync.json'
    const contents = 'repository-owned recovery contents'
    const instance = await github(
      {},
      {
        contentsApiLimit: 1,
        files: { [repo]: { [path]: contents } },
      },
    )

    await expect(Github.fetchFile(client(instance.url), { path, repo })).resolves.toBe(contents)
    expect(instance.requests).toContainEqual({
      method: 'GET',
      path: expect.stringContaining(`/repos/${repo}/git/blobs/`),
    })
  })

  test('error: rejects a repository file over the explicit read limit', async () => {
    const path = '.agents/friction-log/.sync.json'
    const instance = await github(
      {},
      {
        contentsApiLimit: 1,
        files: { [repo]: { [path]: 'x'.repeat(Github.maxFileBytes + 1) } },
      },
    )

    await expect(Github.fetchFile(client(instance.url), { path, repo })).rejects.toThrow(
      Github.FileTooLargeError,
    )
  })
})

describe('marker', () => {
  test('behavior: round trips every field', () => {
    const marker = {
      hash: 'a3f9c1e20b47',
      origin: 'acme/app',
      path: '.agents/friction-log/lazy-squids-chew/friction.md',
    }
    expect(Github.renderMarker(marker)).toMatchInlineSnapshot(
      `"<!-- frog:v1 hash=a3f9c1e20b47 path=.agents/friction-log/lazy-squids-chew/friction.md origin=acme/app -->"`,
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
    ['<!-- frog:v1 -->', undefined],
    ['<!-- frog:v1 path=a.md -->', undefined],
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
        marker: {
          hash: 'abc123',
          origin: 'acme/app',
          path: '.agents/friction-log/one/friction.md',
        },
        provenance: { author: 'Test User', pr: 'acme/app#42', sha: '0123456789abcdef' },
      }),
    ).toMatchInlineSnapshot(`
      "## Description

      The filter was swallowed.

      <!-- frog:v1 hash=abc123 path=.agents/friction-log/one/friction.md origin=acme/app -->

      ---

      <sub>Logged by Test User in \`acme/app\` at \`0123456\` via acme/app#42. Filed by [Frog](https://github.com/wevm/frog).</sub>
      "
    `)
  })

  test('behavior: renders without provenance', () => {
    expect(Github.renderBody({ body: 'Body.', marker: { hash: 'abc123' } })).toMatchInlineSnapshot(`
      "Body.

      <!-- frog:v1 hash=abc123 -->

      ---

      <sub>Logged. Filed by [Frog](https://github.com/wevm/frog).</sub>
      "
    `)
  })

  test('behavior: renders a stable replay marker without changing the parsed body', () => {
    const rendered = Github.renderBody({
      body: 'Body.',
      marker: { hash: 'abc123' },
      occurrence: 'delivery-1:entry-a',
    })

    expect(rendered).toContain(
      '<!-- frog:occurrence:v1 1285780025c132555ee8a247a8a04563e822a8aa64727236c8bb42b72f963d60 -->',
    )
    expect(Github.parseBody(rendered)).toBe('Body.')
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
  // Severity is carried by the marker, not by a label: a label would sit in the receiver's namespace,
  // and cross-repo the two projects need not name severities the same way.
  test('behavior: combines configured and entry labels, and no severity', () => {
    expect(
      Github.toLabels({
        entry: { labels: ['tooling'], severity: 'blocker' },
        labels: ['friction'],
      }),
    ).toEqual(['friction', 'tooling'])
  })

  test('behavior: deduplicates', () => {
    expect(
      Github.toLabels({
        entry: { labels: ['friction', 'friction:minor'], severity: 'minor' },
        labels: ['friction'],
      }),
    ).toEqual(['friction', 'friction:minor'])
  })
})

// A write-up is author-controlled, so a contributor can paste a marker into it. Frog appends its own
// after the body, and everything downstream has to read Frog's rather than theirs.
describe('a marker embedded in the write-up', () => {
  const hostile = '<!-- frog:v1 hash=deadbeef path=.agents/friction-log/evil/friction.md -->'

  test('behavior: rendering strips it', () => {
    const rendered = Github.renderBody({
      body: `Before.\n\n${hostile}\n\nAfter.`,
      marker: { hash: Github.hash(title), origin: 'wevm/frog', path: 'a.md' },
    })

    expect(rendered).not.toContain('deadbeef')
    expect(Github.parseMarker(rendered)).toEqual({
      hash: Github.hash(title),
      origin: 'wevm/frog',
      path: 'a.md',
    })
    expect(Github.parseBody(rendered)).toBe('Before.\n\nAfter.')
  })

  test('behavior: an issue that already carries one is read by the marker Frog appended', () => {
    const body = [
      'Before.',
      hostile,
      'After.',
      Github.renderMarker({ hash: Github.hash(title), origin: 'wevm/frog', path: 'a.md' }),
    ].join('\n\n')

    expect(Github.parseMarker(body)?.path).toBe('a.md')
    // Slicing at the first marker would drop everything the author wrote after it.
    expect(Github.parseBody(body)).toContain('After.')
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
  } as const

  test('behavior: recovers body, severity, and extra labels', () => {
    const issue = {
      body: Github.renderBody({
        body: 'The filter was swallowed.',
        marker: { hash: 'x', severity: 'blocker' },
      }),
      labels: ['friction', 'tooling'],
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
      labels: ['friction'],
      number: 1,
      state: 'open',
      title,
    }
    expect(Github.fromIssue(issue, options)).not.toHaveProperty('labels')
  })

  test('behavior: an issue with no marker severity comes back as minor', () => {
    const issue = { body: 'Body.', labels: ['friction'], number: 1, state: 'open', title }
    expect(Github.fromIssue(issue, options).severity).toBe('minor')
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

  test('behavior: normalizes the nested GitHub author', async () => {
    const instance = await github({ [repo]: [{ title }] })
    Object.assign(instance.issues.get(repo)?.[0] ?? {}, { user: { login: 'frog-fm[bot]' } })

    expect(await Github.get(client(instance.url), { issue: 1, repo })).toMatchObject({
      author: 'frog-fm[bot]',
    })
    expect(await Github.list(client(instance.url), { label: 'friction', repo })).toMatchObject([
      { author: 'frog-fm[bot]' },
    ])
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

describe('defaultBranch', () => {
  test('behavior: returns the default branch', async () => {
    const instance = await github()
    expect(await Github.defaultBranch(client(instance.url), { repo })).toBe('main')
  })

  test('behavior: undefined when the repository does not exist', async () => {
    const instance = await github({}, { errors: { [repo]: 404 } })
    expect(await Github.defaultBranch(client(instance.url), { repo })).toBeUndefined()
  })

  test('error: propagates a transient repository failure', async () => {
    const instance = await github({}, { errors: { [repo]: 503 } })
    await expect(Github.defaultBranch(client(instance.url), { repo })).rejects.toMatchObject({
      status: 503,
    })
  })
})

describe('find', () => {
  test('behavior: finds an unlabelled issue by its marker', async () => {
    const instance = await github({
      [repo]: [
        { body: Github.renderMarker({ hash: Github.hash(title) }), labels: [], title: 'Anything' },
      ],
    })

    // Deliberately a different title, so only the marker can identify it.
    const found = await Github.find(client(instance.url), {
      hash: Github.hash(title),
      repo,
      title: 'Anything',
    })
    expect(found?.number).toBe(1)
    expect(instance.requests).not.toContainEqual({ method: 'GET', path: '/search/issues' })
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

  test('behavior: caps pagination at 50 pages', async () => {
    const seeded = Array.from({ length: 5_001 }, (_, index) => ({
      labels: [],
      title: index === 5_000 ? title : `Unrelated ${index}`,
    }))
    const instance = await github({ [repo]: seeded })

    expect(
      await Github.find(client(instance.url), { hash: Github.hash(title), repo, title }),
    ).toBeUndefined()
    expect(
      instance.requests.filter(
        (request) => request.method === 'GET' && request.path === '/repos/wevm/viem/issues',
      ),
    ).toHaveLength(50)
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

describe('matcher', () => {
  test('behavior: excludes issues from the labelled index', async () => {
    const instance = await github({
      [repo]: [
        { body: 'Reserved.', title },
        { body: 'Legitimate friction.', title },
      ],
    })

    const matcher = await Github.matcher(client(instance.url), {
      exclude: (issue) => issue.body === 'Reserved.',
      label: 'friction',
      repo,
    })

    expect(await matcher.match(title)).toMatchObject({ body: 'Legitimate friction.', number: 2 })
  })

  test('behavior: excludes issues from the unlabelled fallback index', async () => {
    const instance = await github(
      {
        [repo]: [
          { body: 'Reserved.', title },
          { body: 'Legitimate friction.', title },
        ],
      },
      { pushAccess: [] },
    )

    const matcher = await Github.matcher(client(instance.url), {
      exclude: (issue) => issue.body === 'Reserved.',
      label: 'friction',
      repo,
    })

    expect(await matcher.match(title)).toMatchObject({ body: 'Legitimate friction.', number: 2 })
  })

  test('security: only matches issues authored by the expected App', async () => {
    const instance = await github({
      [repo]: [
        { body: Github.renderMarker({ hash: Github.hash(title) }), title: 'Copied marker' },
        { title },
      ],
    })
    const [copied, app] = instance.issues.get(repo) ?? []
    Object.assign(copied ?? {}, { user: { login: 'contributor' } })
    Object.assign(app ?? {}, { user: { login: 'frog-fm[bot]' } })

    const matcher = await Github.matcher(client(instance.url), {
      expectedAuthor: 'frog-fm[bot]',
      label: 'friction',
      repo,
    })

    expect(await matcher.match(title)).toMatchObject({ author: 'frog-fm[bot]', number: 2 })
  })

  test('behavior: keeps hand-filed title matching when no author is expected', async () => {
    const instance = await github({ [repo]: [{ body: 'Filed by hand.', title }] })
    Object.assign(instance.issues.get(repo)?.[0] ?? {}, { user: { login: 'contributor' } })

    const matcher = await Github.matcher(client(instance.url), {
      label: 'friction',
      repo,
    })

    expect(await matcher.match(title)).toMatchObject({ author: 'contributor', number: 1 })
  })
})

describe('findOccurrence', () => {
  const occurrence = 'delivery-1:entry-a'
  const body = Github.renderBody({
    body: 'Body.',
    marker: { hash: 'known' },
    occurrence,
  })

  function occurrenceClient(
    comments: readonly { body: string; user: { login: string } | null }[],
  ): Github.Client {
    return {
      issues: {
        listComments: async () => ({ data: comments }),
      },
    } as unknown as Github.Client
  }

  test('security: ignores occurrence markers in comments by other authors', async () => {
    const existing = {
      author: 'frog-fm[bot]',
      number: 1,
      state: 'open',
      title,
    }

    await expect(
      Github.findOccurrence(occurrenceClient([{ body, user: { login: 'contributor' } }]), {
        existing,
        expectedAuthor: 'frog-fm[bot]',
        occurrence,
        repo,
      }),
    ).resolves.toBeUndefined()

    await expect(
      Github.findOccurrence(occurrenceClient([{ body, user: { login: 'frog-fm[bot]' } }]), {
        existing,
        expectedAuthor: 'frog-fm[bot]',
        occurrence,
        repo,
      }),
    ).resolves.toBe('commented')
  })

  test('behavior: trusts every comment author when no author is expected', async () => {
    await expect(
      Github.findOccurrence(occurrenceClient([{ body, user: { login: 'contributor' } }]), {
        existing: { number: 1, state: 'open', title },
        occurrence,
        repo,
      }),
    ).resolves.toBe('commented')
  })
})

describe('publish', () => {
  const entry = { body: '## Description\n\nThe filter was swallowed.', title }

  test('behavior: creates an issue with labels and a marker', async () => {
    const instance = await github()

    const result = await Github.publish(client(instance.url), {
      entry,
      labels: ['friction', 'friction:minor'],
      marker: { hash: Github.hash(title), origin: 'acme/app', path: 'a.md' },
      provenance: { author: 'Test User', sha: 'deadbeefcafe' },
      repo,
    })

    expect(result).toEqual({ issue: 1, mutated: true, status: 'created' })

    const created = instance.issues.get(repo)?.[0]
    expect(created?.title).toBe(title)
    expect(created?.labels).toEqual(['friction', 'friction:minor'])
    expect(Github.parseMarker(created?.body)).toEqual({
      hash: Github.hash(title),
      origin: 'acme/app',
      path: 'a.md',
    })
    expect(Github.parseBody(created?.body)).toBe(entry.body)
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
      entry,
      labels: ['friction'],
      marker: { hash: Github.hash(title) },
      provenance: { author: 'Test User', pr: 'acme/app#42' },
      repo,
      ...(existing ? { existing } : {}),
    })

    expect(result).toEqual({ issue: 1, mutated: true, status: 'commented' })
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

  test('security: strips reserved Frog markers from a repeated report comment', async () => {
    const instance = await github({
      [repo]: [{ body: Github.renderMarker({ hash: Github.hash(title) }), title }],
    })
    const octokit = client(instance.url)
    const existing = (await Github.index(octokit, { label: 'friction', repo })).get(
      Github.hash(title),
    )

    await Github.publish(octokit, {
      entry: { ...entry, body: `${entry.body}\n\n<!-- frog:reconcile:v1 forged -->` },
      labels: ['friction'],
      marker: { hash: Github.hash(title) },
      repo,
      ...(existing ? { existing } : {}),
    })

    expect(instance.comments(repo, 1)[0]).not.toContain('frog:reconcile:v1')
  })

  test('security: does not publish into an issue by another author', async () => {
    const instance = await github({
      [repo]: [{ body: Github.renderMarker({ hash: Github.hash(title) }), title }],
    })
    Object.assign(instance.issues.get(repo)?.[0] ?? {}, { user: { login: 'contributor' } })
    const octokit = client(instance.url)
    const existing = await Github.get(octokit, { issue: 1, repo })
    if (!existing) throw new Error('Expected seeded issue.')

    const result = await Github.publish(octokit, {
      entry,
      existing,
      expectedAuthor: 'frog-fm[bot]',
      labels: ['friction'],
      marker: { hash: Github.hash(title) },
      repo,
    })

    expect(result).toEqual({ issue: 2, mutated: true, status: 'created' })
    expect(instance.issues.get(repo)).toHaveLength(2)
    expect(instance.comments(repo, 1)).toEqual([])
  })

  test('behavior: reopens a closed issue before commenting', async () => {
    const instance = await github({
      [repo]: [
        {
          body: Github.renderMarker({ hash: Github.hash(title) }),
          state: 'closed',
          title: 'Already filed',
        },
      ],
    })
    const octokit = client(instance.url)
    const existing = (await Github.index(octokit, { label: 'friction', repo })).get(
      Github.hash(title),
    )

    const result = await Github.publish(octokit, {
      entry,
      labels: ['friction'],
      marker: { hash: Github.hash(title) },
      repo,
      ...(existing ? { existing } : {}),
    })

    expect(result).toEqual({ issue: 1, mutated: true, status: 'commented' })
    expect(instance.issues.get(repo)?.[0]?.state).toBe('open')
    expect(instance.comments(repo, 1)).toHaveLength(1)
  })

  test('behavior: publishing twice through the index never duplicates', async () => {
    const instance = await github()
    const octokit = client(instance.url)

    for (const pass of [1, 2]) {
      const indexed = await Github.index(octokit, { label: 'friction', repo })
      const existing = indexed.get(Github.hash(title))
      const result = await Github.publish(octokit, {
        entry,
        labels: ['friction'],
        marker: { hash: Github.hash(title) },
        repo,
        ...(existing ? { existing } : {}),
      })
      expect(result.status).toBe(pass === 1 ? 'created' : 'commented')
    }

    expect(instance.issues.get(repo)).toHaveLength(1)
  })

  test('behavior: replay after issue creation does not add a hit-again comment', async () => {
    const instance = await github({}, { pushAccess: [] })
    const octokit = client(instance.url)
    const occurrence = 'delivery-1:entry-a'

    const first = await Github.publish(octokit, {
      entry,
      labels: ['friction'],
      marker: { hash: Github.hash(title) },
      occurrence,
      repo,
    })
    const matcher = await Github.matcher(octokit, { label: 'friction', repo })
    const existing = await matcher.match(title)
    const replayed = await Github.publish(octokit, {
      entry,
      labels: ['friction'],
      marker: { hash: Github.hash(title) },
      occurrence,
      repo,
      ...(existing ? { existing } : {}),
    })

    expect(first).toEqual({ issue: 1, mutated: true, status: 'created' })
    expect(replayed).toEqual({ issue: 1, mutated: false, status: 'created' })
    expect(instance.issues.get(repo)).toHaveLength(1)
    expect(instance.comments(repo, 1)).toEqual([])
  })

  // An entry left in the log after its issue was closed is re-filed on every push. Reopening there
  // would undo the maintainer's close, repeatedly.
  test('behavior: a replay leaves a closed issue closed', async () => {
    const instance = await github({}, { pushAccess: [] })
    const octokit = client(instance.url)
    const occurrence = 'entry-a'

    await Github.publish(octokit, {
      entry,
      labels: ['friction'],
      marker: { hash: Github.hash(title) },
      occurrence,
      repo,
    })
    await octokit.issues.update({ ...Github.split(repo), issue_number: 1, state: 'closed' })

    const matcher = await Github.matcher(octokit, { label: 'friction', repo })
    const existing = await matcher.match(title)
    const recurrence = await Github.publish(octokit, {
      entry,
      labels: ['friction'],
      marker: { hash: Github.hash(title) },
      occurrence,
      repo,
      ...(existing ? { existing } : {}),
    })

    expect(recurrence).toEqual({ issue: 1, mutated: false, status: 'created' })
    expect(instance.issues.get(repo)?.[0]?.state).toBe('closed')
    expect(instance.comments(repo, 1)).toEqual([])
  })

  // A recurrence is a fresh entry, and entry ids are timestamped, so its occurrence never matches the
  // one already recorded. That is what still reaches the reopen.
  test('behavior: a new occurrence reopens a closed issue', async () => {
    const instance = await github({}, { pushAccess: [] })
    const octokit = client(instance.url)

    await Github.publish(octokit, {
      entry,
      labels: ['friction'],
      marker: { hash: Github.hash(title) },
      occurrence: 'entry-a',
      repo,
    })
    await octokit.issues.update({ ...Github.split(repo), issue_number: 1, state: 'closed' })

    const matcher = await Github.matcher(octokit, { label: 'friction', repo })
    const existing = await matcher.match(title)
    const recurrence = await Github.publish(octokit, {
      entry,
      labels: ['friction'],
      marker: { hash: Github.hash(title) },
      occurrence: 'entry-b',
      repo,
      ...(existing ? { existing } : {}),
    })

    expect(recurrence).toEqual({ issue: 1, mutated: true, status: 'commented' })
    expect(instance.issues.get(repo)?.[0]?.state).toBe('open')
    expect(instance.comments(repo, 1)).toHaveLength(1)
  })

  test('behavior: replay after commenting does not add the comment twice', async () => {
    const instance = await github({
      [repo]: [{ body: Github.renderMarker({ hash: Github.hash(title) }), title }],
    })
    const octokit = client(instance.url)
    const existing = (await Github.index(octokit, { label: 'friction', repo })).get(
      Github.hash(title),
    )
    if (!existing) throw new Error('Expected seeded issue.')

    for (let index = 0; index < 100; index++)
      await octokit.issues.createComment({
        ...Github.split(repo),
        body: `Existing comment ${index}.`,
        issue_number: existing.number,
      })

    const publish = (occurrence: string) =>
      Github.publish(octokit, {
        entry,
        existing,
        labels: ['friction'],
        marker: { hash: Github.hash(title) },
        occurrence,
        repo,
      })

    await expect(publish('delivery-1:entry-a')).resolves.toEqual({
      issue: 1,
      mutated: true,
      status: 'commented',
    })
    await expect(publish('delivery-1:entry-a')).resolves.toEqual({
      issue: 1,
      mutated: false,
      status: 'commented',
    })
    expect(instance.comments(repo, 1)).toHaveLength(101)

    await publish('delivery-2:entry-a')
    expect(instance.comments(repo, 1)).toHaveLength(102)
  })
})
