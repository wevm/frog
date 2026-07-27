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
    delivery?: string | undefined
    installed?: Record<string, Octokit> | undefined
    serialize?: Serialize | undefined
  } = {},
) {
  const octokit = client(url)
  return pullRequest({
    actor: '@contributor',
    base,
    baseRef: 'main',
    client: octokit,
    ...(options.delivery ? { delivery: options.delivery } : {}),
    head: 'main',
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
    { files: { [base]: { [`${dir}/a/friction.md`]: entry('Filters ignored') } } },
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
    { files: { [base]: { [`${dir}/a/friction.md`]: entry('Filters ignored') } } },
  )

  await run(instance.url)

  const body = instance.issues.get(base)?.[0]?.body
  expect(body).toContain(`via ${base}#42`)
  // The issue is authored by the App, so the footer is the only trace of who hit it.
  expect(body).toContain('Logged by @contributor')
})

test('behavior: nothing written back to the pull request branch', async () => {
  const instance = await github(
    {},
    { files: { [base]: { [`${dir}/a/friction.md`]: entry('Filters ignored') } } },
  )

  await run(instance.url)

  // A commit here would trigger `synchronize` and run this again.
  expect(instance.messages(base)).toEqual(['initial'])
  expect(instance.files(base)[`${dir}/a/friction.md`]).not.toContain('issue:')
})

// Every push to the branch re-runs this, and each one is a separate delivery.
test('behavior: a second run opens no issue and adds no comment', async () => {
  const instance = await github(
    {},
    { files: { [base]: { [`${dir}/a/friction.md`]: entry('Filters ignored') } } },
  )

  await run(instance.url, { delivery: 'delivery-1' })
  const second = await run(instance.url, { delivery: 'delivery-2' })

  expect(second.created).toEqual([{ id: 'a', issue: `${base}#1` }])
  expect(instance.issues.get(base)).toHaveLength(1)
  // The issue itself stays quiet. Keying the occurrence on the delivery instead of on what is being
  // reported put a "Hit again" here for every push to an untouched entry.
  expect(instance.comments(base, 1)).toHaveLength(0)
  expect(instance.comments(base, 42)).toHaveLength(1)
})

test('behavior: many pushes to one pull request leave one issue and no comments', async () => {
  const instance = await github(
    {},
    { files: { [base]: { [`${dir}/a/friction.md`]: entry('Filters ignored') } } },
  )

  for (const delivery of ['one', 'two', 'three', 'four']) await run(instance.url, { delivery })

  expect(instance.issues.get(base)).toHaveLength(1)
  expect(instance.comments(base, 1)).toHaveLength(0)
})

// The one repeat worth having: the entry changed, so the issue should hear about it.
test('behavior: an edited entry comments once', async () => {
  const instance = await github(
    {},
    { files: { [base]: { [`${dir}/a/friction.md`]: entry('Filters ignored') } } },
  )

  await run(instance.url, { delivery: 'delivery-1' })
  instance.write(
    base,
    `${dir}/a/friction.md`,
    entry('Filters ignored').replace('swallowed', 'dropped'),
  )
  await run(instance.url, { delivery: 'delivery-2' })
  await run(instance.url, { delivery: 'delivery-3' })

  expect(instance.issues.get(base)).toHaveLength(1)
  expect(instance.comments(base, 1)).toHaveLength(1)
})

test('behavior: concurrent deliveries with the same title open one issue', async () => {
  const instance = await github(
    {},
    { files: { [base]: { [`${dir}/a/friction.md`]: entry('Filters ignored') } } },
  )
  const serialize = serial()

  await Promise.all([
    run(instance.url, { delivery: 'delivery-1', serialize }),
    run(instance.url, { delivery: 'delivery-2', serialize }),
  ])

  expect(instance.issues.get(base)).toHaveLength(1)
  expect(instance.comments(base, 1)).toHaveLength(0)
  expect(instance.comments(base, 42)).toHaveLength(1)
})

test('behavior: an already-linked entry is listed, not filed again', async () => {
  const instance = await github(
    { [base]: [{ title: 'Filters ignored' }] },
    {
      files: {
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
      files: {
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
      files: {
        [base]: {
          'config.placeholder': '',
          [`${dir}/a/friction.md`]: entry('One'),
          [`${dir}/b/friction.md`]: entry('Two'),
          [`${dir}/config.json`]: JSON.stringify({ maxPerRun: 1 }),
        },
      },
    },
  )

  const report = await run(instance.url)

  expect(report.created).toHaveLength(1)
  expect(report.deferred).toEqual([{ id: 'b', reason: 'over the ceiling of 1 per run' }])
})

test('behavior: a refused entry does not consume the ceiling', async () => {
  const instance = await github(
    {},
    {
      files: {
        [base]: {
          [`${dir}/a/friction.md`]: entry('Cannot resolve', { target: 'missing' }),
          [`${dir}/b/friction.md`]: entry('Can file'),
          [`${dir}/config.json`]: JSON.stringify({ maxPerRun: 1 }),
        },
      },
    },
  )

  const report = await run(instance.url)

  expect(report.created).toEqual([{ id: 'b', issue: `${base}#1` }])
  expect(report.deferred).toEqual([
    {
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
        [base]: {
          [`${dir}/a/friction.md`]: entry('Upstream friction', { target: 'viem' }),
          [`${dir}/config.json`]: JSON.stringify(config),
        },
        [upstream]: { [`${dir}/config.json`]: JSON.stringify({ inbound: { enabled: true } }) },
      },
      packages: { viem: upstream },
    }
  }

  test('behavior: defers upstream filing when outbound.auto is off', async () => {
    const instance = await github({}, seed({ outbound: { allowedRepos: [upstream] } }))

    const report = await run(instance.url, { installed: { [upstream]: client(instance.url) } })

    expect(report.deferred[0]?.reason).toContain('`outbound.auto` is off')
    expect(instance.issues.get(upstream)).toBeUndefined()
  })

  test('behavior: files upstream when outbound.auto is on', async () => {
    const instance = await github({}, seed({ outbound: { allowedRepos: [upstream], auto: true } }))

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

    expect(report.deferred[0]?.reason).toBe('frog is not installed on `wevm/viem`.')
    expect(instance.issues.get(upstream)).toBeUndefined()
  })

  test('behavior: defers a target the sender has not allowlisted', async () => {
    const instance = await github({}, seed({ outbound: { auto: true } }))

    const report = await run(instance.url, { installed: { [upstream]: client(instance.url) } })

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
    { files: { [base]: { [`${dir}/a/friction.md`]: entry('Filters ignored') } } },
  )

  await run(instance.url)

  expect(instance.comments(base, 42)[0]).toContain(marker)
})
