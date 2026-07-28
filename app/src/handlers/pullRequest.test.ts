import { Github } from 'frog'
import { Octokit } from 'octokit'
import { github } from '../../../test/github.js'
import { marker } from '../internal/comment.js'
import type { Serialize } from '../internal/serialize.js'
import { pullRequest } from './pullRequest.js'

const base = 'acme/app'
const upstream = 'wevm/viem'
const dir = '.agents/friction-log'

// Throttling paces write requests about a second apart, which is right in production and pointless
// against a local server.
function client(url: string): Octokit {
  return new Octokit({
    auth: 'token',
    baseUrl: url,
    retry: { enabled: false },
    throttle: { enabled: false },
  })
}

function entry(title: string, frontmatter: Record<string, string> = {}): string {
  const fields = Object.entries({ severity: 'minor', title, ...frontmatter })
    .map(([key, value]) => `${key}: '${value}'`)
    .join('\n')
  return `---\n${fields}\n---\n\nThe filter was swallowed.\n`
}

/** Runs the handler against one repository, with no other installation available. */
async function run(
  url: string,
  options: {
    installed?: Record<string, Octokit> | undefined
    serialize?: Serialize | undefined
  } = {},
) {
  const octokit = client(url)
  return pullRequest({
    app: 'frog-fm[bot]',
    actor: '@contributor',
    base,
    baseRef: 'main',
    client: octokit,
    head: 'head',
    installation: async (repo) => options.installed?.[repo],
    pr: 42,
    registry: `${url}/registry`,
    ...(options.serialize ? { serialize: options.serialize } : {}),
  })
}

function serial(): Serialize {
  let tail = Promise.resolve()
  return async (_repo, operation) => {
    const previous = tail
    let release = () => {}
    tail = new Promise<void>((resolve) => {
      release = resolve
    })
    await previous
    try {
      return await operation()
    } finally {
      release()
    }
  }
}

test('behavior: files pending entries and comments once', async () => {
  const instance = await github(
    {},
    { head: { [base]: { [`${dir}/a/friction.md`]: entry('Filters ignored') } } },
  )

  const report = await run(instance.url)

  expect(report.created).toEqual([{ id: 'a', issue: `${base}#1` }])
  expect(instance.issues.get(base)?.[0]?.title).toBe('Filters ignored')
  expect(instance.comments(base, 42)).toHaveLength(1)
  expect(instance.comments(base, 42)[0]).toContain(`${base}#1`)
})

test('behavior: records the pull request and the reporter on the issue', async () => {
  const instance = await github(
    {},
    { head: { [base]: { [`${dir}/a/friction.md`]: entry('Filters ignored') } } },
  )

  await run(instance.url)

  const body = instance.issues.get(base)?.[0]?.body
  expect(body).toContain(`via ${base}#42`)
  // The issue is authored by the App, so the footer is the only trace of who hit it.
  expect(body).toContain('Logged by @contributor')
})

test('security: the App leaves the pull request branch untouched', async () => {
  const instance = await github(
    {},
    { head: { [base]: { [`${dir}/a/friction.md`]: entry('Filters ignored') } } },
  )

  const report = await run(instance.url)

  expect(report.created).toEqual([{ id: 'a', issue: `${base}#1` }])
  expect(instance.messages(base, 'head')).toEqual(['initial', 'head'])
  expect(instance.files(base, 'head')[`${dir}/a/friction.md`]).not.toContain('issue:')
})

// The base branch carries a friction log; this pull request does not touch it. Reading the head alone
// reported every entry already there, and would have filed any of them still unpublished against
// whoever opened an unrelated pull request.
test('behavior: a pull request that changes no entry says nothing', async () => {
  const instance = await github(
    {},
    {
      files: {
        [base]: {
          [`${dir}/a/friction.md`]: entry('Filters ignored'),
          [`${dir}/b/friction.md`]: entry('Already filed', { issue: `${base}#7` }),
        },
      },
      head: { [base]: { 'src/index.ts': 'export {}\n' } },
    },
  )

  const report = await run(instance.url)

  expect(report).toEqual({ commented: [], created: [], deferred: [], linked: [], malformed: [] })
  expect(instance.issues.get(base)).toBeUndefined()
  expect(instance.comments(base, 42)).toEqual([])
})

// Every push to the branch re-runs this, and each one is a separate delivery.
test('behavior: a second run opens no issue and adds no comment', async () => {
  const instance = await github(
    {},
    { head: { [base]: { [`${dir}/a/friction.md`]: entry('Filters ignored') } } },
  )

  await run(instance.url)
  const second = await run(instance.url)

  // The branch stays pending, but the occurrence marker makes the second filing a no-op.
  expect(second.created).toEqual([{ id: 'a', issue: `${base}#1` }])
  expect(second.linked).toEqual([])
  expect(instance.issues.get(base)).toHaveLength(1)
  // The issue itself stays quiet. Keying the occurrence on the delivery instead of on what is being
  // reported put a "Hit again" here for every push to an untouched entry.
  expect(instance.comments(base, 1)).toHaveLength(0)
  expect(instance.comments(base, 42)).toHaveLength(1)
})

test('behavior: many pushes to one pull request leave one issue and no comments', async () => {
  const instance = await github(
    {},
    { head: { [base]: { [`${dir}/a/friction.md`]: entry('Filters ignored') } } },
  )

  for (let attempt = 0; attempt < 4; attempt++) await run(instance.url)

  expect(instance.issues.get(base)).toHaveLength(1)
  expect(instance.comments(base, 1)).toHaveLength(0)
})

test('behavior: a title edit reuses the issue carrying the occurrence', async () => {
  const instance = await github(
    {},
    { head: { [base]: { [`${dir}/a/friction.md`]: entry('Filters ignored') } } },
  )

  await run(instance.url)
  instance.write(base, `${dir}/a/friction.md`, entry('Filters renamed'), 'head')
  const second = await run(instance.url)

  expect(second.created).toEqual([{ id: 'a', issue: `${base}#1` }])
  expect(instance.issues.get(base)).toHaveLength(1)
  expect(instance.comments(base, 1)).toHaveLength(0)
})

test('behavior: a title edit reuses an occurrence carried by a comment', async () => {
  const instance = await github(
    {},
    { head: { [base]: { [`${dir}/a/friction.md`]: entry('Filters ignored') } } },
  )
  const changed = entry('Filters ignored').replace('swallowed', 'dropped')

  await run(instance.url)
  instance.write(base, `${dir}/a/friction.md`, changed, 'head')
  await run(instance.url)
  instance.write(base, `${dir}/a/friction.md`, changed.replace('ignored', 'renamed'), 'head')
  const third = await run(instance.url)

  expect(third.commented).toEqual([{ id: 'a', issue: `${base}#1` }])
  expect(instance.issues.get(base)).toHaveLength(1)
  expect(instance.comments(base, 1)).toHaveLength(1)
})

// The one repeat worth having: the entry changed, so the issue should hear about it.
test('behavior: an edited entry comments once', async () => {
  const instance = await github(
    {},
    { head: { [base]: { [`${dir}/a/friction.md`]: entry('Filters ignored') } } },
  )

  await run(instance.url)
  instance.write(
    base,
    `${dir}/a/friction.md`,
    entry('Filters ignored').replace('swallowed', 'dropped'),
    'head',
  )
  await run(instance.url)
  await run(instance.url)

  expect(instance.issues.get(base)).toHaveLength(1)
  expect(instance.comments(base, 1)).toHaveLength(1)
})

// The edit that a title-shaped hash would have thrown away: punctuation and case only. Adding the `--`
// a command was missing changes what the report means, so the issue has to hear about it.
test('behavior: an edit of only punctuation still comments', async () => {
  const instance = await github(
    {},
    { head: { [base]: { [`${dir}/a/friction.md`]: entry('Filters ignored') } } },
  )

  // Same words either side. Only the `--` differs, which a title-shaped hash discards.
  const before = entry('Filters ignored').replace(
    'The filter was swallowed.',
    'Run `pnpm test src/foo.test.ts`.',
  )
  const after = before.replace('pnpm test src', 'pnpm test -- src')

  instance.write(base, `${dir}/a/friction.md`, before, 'head')
  await run(instance.url)
  instance.write(base, `${dir}/a/friction.md`, after, 'head')
  await run(instance.url)

  expect(instance.comments(base, 1)).toHaveLength(1)
})

test('behavior: concurrent deliveries with the same title open one issue', async () => {
  const instance = await github(
    {},
    { head: { [base]: { [`${dir}/a/friction.md`]: entry('Filters ignored') } } },
  )
  const serialize = serial()

  await Promise.all([run(instance.url, { serialize }), run(instance.url, { serialize })])

  expect(instance.issues.get(base)).toHaveLength(1)
  expect(instance.comments(base, 1)).toHaveLength(0)
  expect(instance.comments(base, 42)).toHaveLength(1)
})

test('behavior: an already-linked entry is listed, not filed again', async () => {
  const instance = await github(
    { [base]: [{ title: 'Filters ignored' }] },
    {
      head: {
        [base]: { [`${dir}/a/friction.md`]: entry('Filters ignored', { issue: `${base}#1` }) },
      },
    },
  )

  const report = await run(instance.url)

  expect(report).toMatchObject({
    commented: [],
    created: [],
    linked: [{ id: 'a', issue: `${base}#1` }],
  })
  expect(instance.issues.get(base)).toHaveLength(1)
})

test('behavior: a malformed entry is reported without stopping the rest', async () => {
  const instance = await github(
    {},
    {
      head: {
        [base]: {
          [`${dir}/broken/friction.md`]: '# no frontmatter\n',
          [`${dir}/good/friction.md`]: entry('Filters ignored'),
        },
      },
    },
  )

  const report = await run(instance.url)

  expect(report.created).toEqual([{ id: 'good', issue: `${base}#1` }])
  expect(report.malformed.map((value) => value.id)).toEqual(['broken'])
  expect(instance.comments(base, 42)[0]).toContain('could not be read')
})

test('behavior: entries over the ceiling are deferred', async () => {
  const instance = await github(
    {},
    {
      files: { [base]: { [`${dir}/config.json`]: JSON.stringify({ maxPerRun: 1 }) } },
      head: {
        [base]: {
          [`${dir}/a/friction.md`]: entry('One'),
          [`${dir}/b/friction.md`]: entry('Two'),
        },
      },
    },
  )

  const report = await run(instance.url)

  expect(report.created).toHaveLength(1)
  expect(report.deferred).toEqual([
    { code: 'OVER_CEILING', id: 'b', reason: 'over the ceiling of 1 per run' },
  ])
})

test('behavior: a refused entry does not consume the ceiling', async () => {
  const instance = await github(
    {},
    {
      files: { [base]: { [`${dir}/config.json`]: JSON.stringify({ maxPerRun: 1 }) } },
      head: {
        [base]: {
          [`${dir}/a/friction.md`]: entry('Cannot resolve', { target: 'missing' }),
          [`${dir}/b/friction.md`]: entry('Can file'),
        },
      },
    },
  )

  const report = await run(instance.url)

  expect(report.created).toEqual([{ id: 'b', issue: `${base}#1` }])
  expect(report.deferred).toEqual([
    {
      code: 'TARGET_UNKNOWN',
      id: 'a',
      reason:
        '`missing` is not installed, or declares no GitHub repository. Name the repository instead, as `owner/name`.',
    },
  ])
})

describe('cross-repo', () => {
  /**
   * A consumer with one upstream-targeted entry, and an upstream that has committed its consent.
   *
   * The registry maps the package name to its repository, standing in for the `node_modules` read the
   * App cannot do. Consent itself comes from the upstream repository, as it does everywhere else.
   */
  function seed(config: Record<string, unknown>) {
    return {
      files: {
        [base]: { [`${dir}/config.json`]: JSON.stringify(config) },
        [upstream]: { [`${dir}/config.json`]: JSON.stringify({ inbound: { enabled: true } }) },
      },
      head: {
        [base]: { [`${dir}/a/friction.md`]: entry('Upstream friction', { target: 'viem' }) },
      },
      packages: { viem: upstream },
    }
  }

  test('behavior: refuses upstream filing when outbound is disabled', async () => {
    const instance = await github(
      {},
      seed({ outbound: { allowedRepos: [upstream], enabled: false } }),
    )

    const report = await run(instance.url, { installed: { [upstream]: client(instance.url) } })

    expect(report.deferred[0]?.code).toBe('OUTBOUND_DISABLED')
    expect(report.deferred[0]?.reason).toContain('`outbound.enabled` is off')
    expect(instance.issues.get(upstream)).toBeUndefined()
  })

  test('behavior: files upstream without waiting for a human', async () => {
    const instance = await github({}, seed({}))

    const report = await run(instance.url, { installed: { [upstream]: client(instance.url) } })

    expect(report.created).toEqual([{ id: 'a', issue: `${upstream}#1` }])
    expect(instance.issues.get(upstream)?.[0]?.title).toBe('Upstream friction')
    // The marker records the consumer, so closing upstream can find the mirror.
    expect(Github.parseMarker(instance.issues.get(upstream)?.[0]?.body)).toMatchObject({
      origin: base,
    })
  })

  // No installation on the receiver means no token, so GitHub itself prevents the filing.
  test('behavior: defers when the App is not installed on the target', async () => {
    const instance = await github({}, seed({ outbound: { allowedRepos: [upstream], auto: true } }))

    const report = await run(instance.url)

    expect(report.deferred[0]?.code).toBe('INSTALLATION_MISSING')
    expect(report.deferred[0]?.reason).toBe('Frog is not installed on `wevm/viem`.')
    expect(instance.issues.get(upstream)).toBeUndefined()
  })

  test('behavior: defers a target the sender has not allowlisted', async () => {
    const instance = await github({}, seed({ outbound: { allowedRepos: [] } }))

    const report = await run(instance.url, { installed: { [upstream]: client(instance.url) } })

    expect(report.deferred[0]?.code).toBe('TARGET_NOT_ALLOWED')
    expect(report.deferred[0]?.reason).toContain('not listed in `outbound.allowedRepos`')
  })
})

test('behavior: no entries posts no comment', async () => {
  const instance = await github({}, { files: { [base]: { 'README.md': '# app' } } })

  const report = await run(instance.url)

  expect(report).toEqual({ commented: [], created: [], deferred: [], linked: [], malformed: [] })
  expect(instance.comments(base, 42)).toEqual([])
})

test('behavior: the comment carries the marker that keeps it single', async () => {
  const instance = await github(
    {},
    { head: { [base]: { [`${dir}/a/friction.md`]: entry('Filters ignored') } } },
  )

  await run(instance.url)

  expect(instance.comments(base, 42)[0]).toContain(marker)
})
