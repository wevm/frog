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

describe('report', () => {
  // Pinned deliberately. The App and CLI share this identity across automation modes.
  test('behavior: is stable', () => {
    const value = Github.report({
      entry: {
        body: 'Body:\n\nunchanged.',
        id: 'entry-a',
        severity: 'minor',
        title: 'A friction',
      },
      origin: 'acme/app',
    })

    expect(value).toBe('acme/app:entry-a')
    expect(
      Github.report({
        entry: {
          body: 'Edited.',
          id: 'entry-a',
          severity: 'major',
          title: 'Renamed friction',
        },
        origin: 'acme/app',
      }),
    ).toBe(value)
    expect(
      Github.report({
        entry: {
          body: 'Body:\n\nunchanged.',
          id: 'entry-b',
          severity: 'minor',
          title: 'A friction',
        },
        origin: 'acme/app',
      }),
    ).not.toBe(value)
  })
})

describe('occurrence', () => {
  test('behavior: preserves the v1 compatibility key', () => {
    const value = {
      body: 'Body.',
      id: 'entry-a',
      severity: 'minor',
      title: 'A friction',
    } as const
    const occurrence = Github.occurrence({ entry: value, origin: 'acme/app' })

    expect(occurrence).toBe('acme/app:entry-a:Body.')
    expect(Github.occurrence({ entry: { ...value, title: 'Renamed' }, origin: 'acme/app' })).toBe(
      occurrence,
    )
    expect(Github.occurrence({ entry: { ...value, severity: 'major' }, origin: 'acme/app' })).toBe(
      occurrence,
    )
  })
})

describe('revision', () => {
  test('behavior: changes with report content', () => {
    const value = {
      body: 'Body.',
      id: 'entry-a',
      severity: 'minor',
      title: 'A friction',
    } as const
    const revision = Github.revision({ entry: value, origin: 'acme/app' })

    expect(Github.revision({ entry: { ...value, body: 'Edited.' }, origin: 'acme/app' })).not.toBe(
      revision,
    )
    expect(Github.revision({ entry: { ...value, title: 'Renamed' }, origin: 'acme/app' })).not.toBe(
      revision,
    )
    expect(
      Github.revision({ entry: { ...value, severity: 'major' }, origin: 'acme/app' }),
    ).not.toBe(revision)
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
  test('behavior: matches a report before a changed title', async () => {
    const report = 'acme/app:entry-a'
    const instance = await github(
      {
        [repo]: [
          {
            body: Github.renderBody({
              body: 'Legitimate friction.',
              marker: { hash: Github.hash(title) },
              report,
            }),
            title,
          },
        ],
      },
      { author: 'frog-fm[bot]', pushAccess: [] },
    )

    const matcher = await Github.matcher(client(instance.url), {
      expectedAuthor: 'frog-fm[bot]',
      label: 'friction',
      repo,
    })

    expect(await matcher.match('Renamed friction', { report })).toMatchObject({ number: 1 })
  })

  test('behavior: retains earlier title changes while reindexing later reports', async () => {
    const instance = await github(
      {
        [repo]: [
          {
            body: Github.renderBody({
              body: 'First body.',
              marker: { hash: Github.hash('First old title') },
              report: 'acme/app:entry-a',
            }),
            title: 'First old title',
          },
          {
            body: Github.renderBody({
              body: 'Second body.',
              marker: { hash: Github.hash('Second old title') },
              report: 'acme/app:entry-b',
            }),
            title: 'Second old title',
          },
        ],
      },
      { pushAccess: [] },
    )
    const matcher = await Github.matcher(client(instance.url), { label: 'friction', repo })

    await expect(
      matcher.match('First new title', { report: 'acme/app:entry-a' }),
    ).resolves.toMatchObject({ number: 1 })
    await expect(
      matcher.match('Second new title', { report: 'acme/app:entry-b' }),
    ).resolves.toMatchObject({ number: 2 })
    await expect(
      matcher.match('First old title', { report: 'acme/app:entry-c' }),
    ).resolves.toBeUndefined()
    await expect(matcher.match('First new title')).resolves.toMatchObject({ number: 1 })
  })

  test('behavior: matches a legacy mirror after its title and body change', async () => {
    const report = 'acme/app:entry-a'
    const path = '.agents/friction-log/entry-a/friction.md'
    const instance = await github(
      {
        [repo]: [
          {
            body: Github.renderBody({
              body: 'Old body.',
              marker: { hash: Github.hash(title), origin: 'acme/app', path },
              occurrence: `${report}:Old body.`,
            }),
            title,
          },
        ],
      },
      { author: 'frog-fm[bot]', pushAccess: [] },
    )

    const matcher = await Github.matcher(client(instance.url), {
      expectedAuthor: 'frog-fm[bot]',
      label: 'friction',
      repo,
    })

    expect(
      await matcher.match('Renamed friction', {
        marker: { hash: Github.hash('Renamed friction'), origin: 'acme/app', path },
        occurrence: `${report}:Edited body.`,
        report,
      }),
    ).toMatchObject({ number: 1 })
  })

  test('behavior: paginates and caches reports carried by comments', async () => {
    const report = 'acme/app:entry-a'
    const instance = await github(
      {
        [repo]: [
          {
            author: 'frog-fm[bot]',
            body: Github.renderBody({
              body: 'Legitimate friction.',
              marker: { hash: Github.hash(title) },
              occurrence: 'delivery-1:entry-a',
            }),
            title,
          },
        ],
      },
      { author: 'frog-fm[bot]', pushAccess: [] },
    )
    instance.addComment(
      repo,
      1,
      Github.renderBody({
        body: 'Legitimate friction changed.',
        marker: { hash: Github.hash(title) },
        report,
      }),
      'frog-fm[bot]',
    )
    for (let index = 0; index < 100; index++)
      instance.addComment(repo, 1, `Newer comment ${index}.`, 'frog-fm[bot]')

    const matcher = await Github.matcher(client(instance.url), {
      expectedAuthor: 'frog-fm[bot]',
      label: 'friction',
      repo,
    })

    expect(await matcher.match('Renamed friction', { report })).toMatchObject({ number: 1 })
    await matcher.match('Another friction', { report: 'missing' })
    expect(
      instance.requests.filter((request) => request.path === `/repos/${repo}/issues/comments`),
    ).toHaveLength(2)
  })

  test('security: comment occurrences require the expected issue and comment authors', async () => {
    const occurrence = 'delivery-2:entry-a'
    const body = Github.renderBody({
      body: 'Legitimate friction changed.',
      marker: { hash: Github.hash(title) },
      occurrence,
    })
    const instance = await github(
      {
        [repo]: [
          { author: 'contributor', title: 'Untrusted issue' },
          { author: 'frog-fm[bot]', title: 'Trusted issue' },
        ],
      },
      { author: 'frog-fm[bot]', pushAccess: [] },
    )
    instance.addComment(repo, 1, body, 'frog-fm[bot]')
    instance.addComment(repo, 2, body, 'contributor')

    const matcher = await Github.matcher(client(instance.url), {
      expectedAuthor: 'frog-fm[bot]',
      label: 'friction',
      repo,
    })

    await expect(matcher.match('Renamed friction', { occurrence })).resolves.toBeUndefined()
  })

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
      marker: { hash: Github.hash(title), origin: 'acme/app' },
      provenance: { author: '@jxom', pr: 'acme/app#42' },
      repo,
      ...(existing ? { existing } : {}),
    })

    expect(result).toEqual({ issue: 1, mutated: true, status: 'commented' })
    expect(instance.issues.get(repo)).toHaveLength(1)
    expect(instance.comments(repo, 1)).toMatchInlineSnapshot(`
      [
        "Hit again by [**@jxom**](https://github.com/jxom) in acme/app via [#42](https://github.com/acme/app/pull/42).

      <details>
      <summary>Details</summary>

      ## Description

      The filter was swallowed.

      </details>
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

  test('behavior: an edited report updates its issue in place', async () => {
    const instance = await github({}, { pushAccess: [] })
    const octokit = client(instance.url)
    const report = 'report-a'

    const first = await Github.publish(octokit, {
      entry,
      labels: ['friction'],
      marker: { hash: Github.hash(title) },
      occurrence: 'occurrence-a',
      repo,
      report,
      revision: 'revision-1',
    })
    const matcher = await Github.matcher(octokit, { label: 'friction', repo })
    const changed = { body: 'Updated details.', title: 'Updated title' }
    const existing = await matcher.match(changed.title, { report })
    const updated = await Github.publish(octokit, {
      entry: changed,
      labels: ['friction'],
      marker: { hash: Github.hash(changed.title) },
      occurrence: 'occurrence-a',
      repo,
      report,
      revision: 'revision-2',
      ...(existing ? { existing } : {}),
    })
    const current = await Github.get(octokit, { issue: 1, repo })
    if (!current) throw new Error('Expected updated issue.')
    const replayed = await Github.publish(octokit, {
      entry: changed,
      existing: current,
      labels: ['friction'],
      marker: { hash: Github.hash(changed.title) },
      occurrence: 'occurrence-a',
      repo,
      report,
      revision: 'revision-2',
    })

    expect(first).toEqual({ issue: 1, mutated: true, status: 'created' })
    expect(updated).toEqual({ issue: 1, mutated: true, status: 'created' })
    expect(replayed).toEqual({ issue: 1, mutated: false, status: 'created' })
    expect(instance.issues.get(repo)).toHaveLength(1)
    expect(instance.issues.get(repo)?.[0]?.title).toBe(changed.title)
    expect(Github.parseBody(instance.issues.get(repo)?.[0]?.body)).toBe(changed.body)
    expect(instance.comments(repo, 1)).toEqual([])
  })

  test('behavior: migrates a v1 issue without adding a recurrence', async () => {
    const occurrence = 'acme/app:entry-a:Body.'
    const report = 'acme/app:entry-a'
    const marker = { hash: Github.hash(title), origin: 'acme/app', path: 'entry-a/friction.md' }
    const legacyBody = `${Github.renderBody({ body: 'Body.', marker, occurrence }).trimEnd()}\n\nMaintainer note.\n`
    const instance = await github({
      [repo]: [{ body: legacyBody, title }],
    })
    const octokit = client(instance.url)
    const matcher = await Github.matcher(octokit, { label: 'friction', repo })
    const existing = await matcher.match(title, { occurrence, report })
    if (!existing) throw new Error('Expected v1 issue.')

    const migrated = await Github.publish(octokit, {
      entry: { body: 'Body.', title },
      existing,
      labels: ['friction'],
      marker,
      occurrence,
      repo,
      report,
      revision: 'revision-a',
    })

    expect(migrated).toEqual({ issue: 1, mutated: true, status: 'created' })
    expect(instance.comments(repo, 1)).toEqual([])
    expect(instance.issues.get(repo)?.[0]?.body).toContain('Maintainer note.')

    const current = await Github.get(octokit, { issue: 1, repo })
    if (!current) throw new Error('Expected migrated issue.')
    await expect(
      Github.publish(octokit, {
        entry: { body: 'Body.', title },
        existing: current,
        labels: ['friction'],
        marker,
        occurrence,
        repo,
        report,
        revision: 'revision-a',
      }),
    ).resolves.toEqual({ issue: 1, mutated: false, status: 'created' })

    const edited = await Github.get(octokit, { issue: 1, repo })
    if (!edited) throw new Error('Expected migrated issue.')
    await expect(
      Github.publish(octokit, {
        entry: { body: 'Edited body.', title },
        existing: edited,
        labels: ['friction'],
        marker,
        occurrence: `${report}:Edited body.`,
        repo,
        report,
        revision: 'revision-b',
      }),
    ).resolves.toEqual({ issue: 1, mutated: true, status: 'created' })

    const body = instance.issues.get(repo)?.[0]?.body ?? ''
    expect(Github.parseBody(body)).toBe('Edited body.')
    expect(body).toContain('Maintainer note.')
    expect(body.match(/<!-- frog:report:v1 /g)).toHaveLength(1)
    expect(body.match(/<!-- frog:revision:v1 /g)).toHaveLength(1)
    expect(instance.comments(repo, 1)).toEqual([])
  })

  test('behavior: a v1 migration updates the exact issue title', async () => {
    const before = 'BUILD-cache misses!'
    const after = 'Build cache misses'
    const occurrence = 'acme/app:entry-a:Body.'
    const report = 'acme/app:entry-a'
    const marker = {
      hash: Github.hash(after),
      origin: 'acme/app',
      path: 'entry-a/friction.md',
    }
    const instance = await github({
      [repo]: [
        {
          body: Github.renderBody({ body: 'Body.', marker, occurrence }),
          title: before,
        },
      ],
    })
    const octokit = client(instance.url)
    const matcher = await Github.matcher(octokit, { label: 'friction', repo })
    const existing = await matcher.match(after, { occurrence, report })
    if (!existing) throw new Error('Expected v1 issue.')

    await Github.publish(octokit, {
      entry: { body: 'Body.', title: after },
      existing,
      labels: ['friction'],
      marker,
      occurrence,
      repo,
      report,
      revision: 'revision-a',
    })

    expect(instance.issues.get(repo)?.[0]?.title).toBe(after)
    expect(instance.comments(repo, 1)).toEqual([])
  })

  test('behavior: migrates an edited v1 recurrence comment in place', async () => {
    const report = 'acme/app:entry-b'
    const occurrence = `${report}:Updated body.`
    const changedTitle = 'Renamed friction'
    const legacy = Github.renderBody({
      body: 'Old body.',
      marker: { hash: Github.hash(title) },
      occurrence: `${report}:Old body.`,
    })
    const marker = legacy.match(/<!-- frog:occurrence:v1 [0-9a-f]{64} -->/)?.[0]
    if (!marker) throw new Error('Expected v1 occurrence marker.')
    const instance = await github({
      [repo]: [{ body: Github.renderMarker({ hash: Github.hash(title) }), title }],
    })
    instance.addComment(repo, 1, `Hit again in \`acme/app\`.\n\nOld body.\n\n${marker}\n`)
    const octokit = client(instance.url)
    const matcher = await Github.matcher(octokit, { label: 'friction', repo })
    const existing = await matcher.match(changedTitle, { occurrence, report })
    if (!existing) throw new Error('Expected v1 recurrence.')

    const migrated = await Github.publish(octokit, {
      entry: { body: 'Updated body.', title: changedTitle },
      existing,
      labels: ['friction'],
      marker: { hash: Github.hash(changedTitle), origin: 'acme/app' },
      occurrence,
      repo,
      report,
      revision: 'revision-b',
    })

    expect(migrated).toEqual({ issue: 1, mutated: true, status: 'commented' })
    expect(instance.comments(repo, 1)).toHaveLength(1)
    expect(instance.comments(repo, 1)[0]).toContain('Updated body.')
    expect(instance.comments(repo, 1)[0]).toContain('<summary>Details</summary>')
    expect(instance.issues.get(repo)).toHaveLength(1)
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

  test('behavior: scans comments once when locating a report', async () => {
    const report = 'acme/app:entry-a'
    const instance = await github({
      [repo]: [
        {
          body: Github.renderBody({
            body: 'Existing body.',
            marker: { hash: Github.hash(title), origin: 'acme/app', path: 'existing.md' },
            report: 'acme/app:existing',
          }),
          title,
        },
      ],
    })
    instance.addComment(
      repo,
      1,
      Github.renderBody({
        body: 'Untrusted body.',
        marker: { hash: Github.hash(title) },
        report,
      }),
      'contributor',
    )
    for (let index = 1; index < 100; index++)
      instance.addComment(repo, 1, `Existing comment ${index}.`, 'frog-fm[bot]')
    const octokit = client(instance.url)
    const existing = await Github.get(octokit, { issue: 1, repo })
    if (!existing) throw new Error('Expected seeded issue.')

    await expect(
      Github.publish(octokit, {
        entry,
        existing,
        expectedAuthor: 'frog-fm[bot]',
        labels: ['friction'],
        marker: { hash: Github.hash(title), origin: 'acme/app', path: 'entry-a.md' },
        occurrence: 'occurrence-a',
        repo,
        report,
      }),
    ).resolves.toEqual({ issue: 1, mutated: true, status: 'commented' })

    expect(instance.comments(repo, 1)).toHaveLength(101)
    expect(
      instance.requests.filter(
        (request) =>
          request.method === 'GET' && request.path === `/repos/${repo}/issues/1/comments`,
      ),
    ).toHaveLength(2)
  })

  test('behavior: a revisionless recurrence replays without another update', async () => {
    const instance = await github({
      [repo]: [{ body: Github.renderMarker({ hash: Github.hash(title) }), title }],
    })
    const octokit = client(instance.url)
    const existing = (await Github.index(octokit, { label: 'friction', repo })).get(
      Github.hash(title),
    )
    if (!existing) throw new Error('Expected seeded issue.')
    const publish = () =>
      Github.publish(octokit, {
        entry,
        existing,
        labels: ['friction'],
        marker: { hash: Github.hash(title) },
        occurrence: 'occurrence-a',
        repo,
        report: 'report-a',
      })

    await expect(publish()).resolves.toEqual({
      issue: 1,
      mutated: true,
      status: 'commented',
    })
    await expect(publish()).resolves.toEqual({
      issue: 1,
      mutated: false,
      status: 'commented',
    })
    expect(instance.comments(repo, 1)).toHaveLength(1)
  })

  test('behavior: an edited recurrence updates its comment in place', async () => {
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

    const publish = (report: string, revision: string, body = entry.body) =>
      Github.publish(octokit, {
        entry: { ...entry, body },
        existing,
        labels: ['friction'],
        marker: { hash: Github.hash(title) },
        occurrence: `${report}:${body}`,
        repo,
        report,
        revision,
      })

    await expect(publish('report-a', 'revision-1')).resolves.toEqual({
      issue: 1,
      mutated: true,
      status: 'commented',
    })
    await expect(publish('report-a', 'revision-1')).resolves.toEqual({
      issue: 1,
      mutated: false,
      status: 'commented',
    })
    expect(instance.comments(repo, 1)).toHaveLength(101)

    await expect(publish('report-a', 'revision-2', 'Updated details.')).resolves.toEqual({
      issue: 1,
      mutated: true,
      status: 'commented',
    })
    expect(instance.comments(repo, 1)).toHaveLength(101)
    expect(instance.comments(repo, 1).at(-1)).toContain('Updated details.')

    await publish('report-b', 'revision-1')
    expect(instance.comments(repo, 1)).toHaveLength(102)
  })
})
