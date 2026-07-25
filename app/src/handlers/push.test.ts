import { Entry, Github } from 'frog'
import { Octokit } from 'octokit'
import { github } from '../../../test/github.js'
import { push } from './push.js'

const repo = 'acme/app'
const upstream = 'wevm/viem'
const dir = '.agents/friction-log'

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

async function run(url: string, options: { installed?: Record<string, Octokit> } = {}) {
  return push({
    branch: 'main',
    client: client(url),
    installation: async (name) => options.installed?.[name],
    registry: `${url}/registry`,
    repo,
  })
}

test('behavior: files pending entries and writes the link back in one commit', async () => {
  const instance = await github(
    {},
    { files: { [repo]: { [`${dir}/a.md`]: entry('Filters ignored') } } },
  )

  const outcome = await run(instance.url)

  expect(outcome.created).toEqual([{ id: 'a', issue: `${repo}#1` }])
  expect(outcome.committed).toBeTruthy()
  expect(instance.messages(repo)).toEqual(['initial', 'chore: link friction log to issues'])

  const written = instance.files(repo)[`${dir}/a.md`] ?? ''
  expect(Entry.parse(written, { id: 'a' }).issue).toBe(`${repo}#1`)
})

// The commit written here triggers another push. That run must do nothing.
test('behavior: the write-back does not cause a second commit', async () => {
  const instance = await github(
    {},
    { files: { [repo]: { [`${dir}/a.md`]: entry('Filters ignored') } } },
  )

  await run(instance.url)
  const second = await run(instance.url)

  expect(second).toEqual({ commented: [], created: [], deferred: [] })
  expect(instance.messages(repo)).toHaveLength(2)
  expect(instance.issues.get(repo)).toHaveLength(1)
})

// A fork's pull request had issues filed but could not have its files updated.
test('behavior: an entry filed on a pull request gets its link on merge', async () => {
  const instance = await github(
    {
      [repo]: [
        {
          body: Github.renderMarker({ hash: Github.hash('Filters ignored') }),
          title: 'Filters ignored',
        },
      ],
    },
    { files: { [repo]: { [`${dir}/a.md`]: entry('Filters ignored') } } },
  )

  const outcome = await run(instance.url)

  // Commented, not created: the issue already existed from the pull request run.
  expect(outcome.commented).toEqual([{ id: 'a', issue: `${repo}#1` }])
  expect(instance.issues.get(repo)).toHaveLength(1)
  const written = instance.files(repo)[`${dir}/a.md`] ?? ''
  expect(Entry.parse(written, { id: 'a' }).issue).toBe(`${repo}#1`)
})

test('behavior: nothing pending makes no commit', async () => {
  const instance = await github(
    {},
    { files: { [repo]: { [`${dir}/a.md`]: entry('Filters ignored', { issue: `${repo}#7` }) } } },
  )

  const outcome = await run(instance.url)

  expect(outcome).toEqual({ commented: [], created: [], deferred: [] })
  expect(instance.messages(repo)).toEqual(['initial'])
})

test('behavior: a deferred entry keeps its file untouched', async () => {
  const instance = await github(
    {},
    {
      files: {
        [repo]: {
          [`${dir}/a.md`]: entry('Upstream friction', { target: 'viem' }),
          [`${dir}/config.json`]: JSON.stringify({ outbound: { allowedRepos: [upstream] } }),
        },
      },
      packages: { viem: { inbound: true, repo: upstream } },
    },
  )

  const outcome = await run(instance.url, { installed: { [upstream]: client(instance.url) } })

  expect(outcome.deferred[0]?.reason).toContain('`outbound.auto` is off')
  expect(outcome.committed).toBeUndefined()
  expect(instance.files(repo)[`${dir}/a.md`]).not.toContain('issue:')
})

test('behavior: an upstream filing writes the link into this repository', async () => {
  const instance = await github(
    {},
    {
      files: {
        [repo]: {
          [`${dir}/a.md`]: entry('Upstream friction', { target: 'viem' }),
          [`${dir}/config.json`]: JSON.stringify({
            outbound: { allowedRepos: [upstream], auto: true },
          }),
        },
      },
      packages: { viem: { inbound: true, repo: upstream } },
    },
  )

  const outcome = await run(instance.url, { installed: { [upstream]: client(instance.url) } })

  expect(outcome.created).toEqual([{ id: 'a', issue: `${upstream}#1` }])
  const written = instance.files(repo)[`${dir}/a.md`] ?? ''
  expect(Entry.parse(written, { id: 'a' }).issue).toBe(`${upstream}#1`)
})
