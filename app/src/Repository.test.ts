import { Octokit } from 'octokit'
import { github } from '../../test/github.js'
import * as Repository from './Repository.js'

const repo = 'acme/app'
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

function entry(title: string, body = 'Body.'): string {
  return `---\ntitle: '${title}'\nseverity: 'minor'\n---\n\n${body}\n`
}

describe('read', () => {
  test('behavior: reads every entry without cloning', async () => {
    const instance = await github(
      {},
      {
        files: {
          [repo]: {
            'README.md': '# app',
            [`${dir}/README.md`]: 'docs, not an entry',
            [`${dir}/a/friction.md`]: entry('Filters ignored'),
            [`${dir}/b/friction.md`]: entry('Slow install'),
          },
        },
      },
    )

    const { entries, malformed } = await Repository.read(client(instance.url), { repo })

    expect(entries.map((value) => value.id)).toEqual(['a', 'b'])
    expect(entries[0]).toMatchObject({ body: 'Body.', severity: 'minor', title: 'Filters ignored' })
    expect(malformed).toEqual([])
  })

  test('behavior: a repository with no entries reads empty', async () => {
    const instance = await github({}, { files: { [repo]: { 'README.md': '# app' } } })
    expect(await Repository.read(client(instance.url), { repo })).toEqual({
      entries: [],
      malformed: [],
    })
  })

  // One broken entry must not hide the rest, and the contributor should be told which it was.
  test('behavior: collects a malformed entry rather than failing', async () => {
    const instance = await github(
      {},
      {
        files: {
          [repo]: {
            [`${dir}/broken/friction.md`]: '# no frontmatter\n',
            [`${dir}/good/friction.md`]: entry('Filters ignored'),
          },
        },
      },
    )

    const { entries, malformed } = await Repository.read(client(instance.url), { repo })

    expect(entries.map((value) => value.id)).toEqual(['good'])
    expect(malformed).toMatchInlineSnapshot(`
      [
        {
          "id": "broken",
          "reason": "Entry \`broken\` has no valid YAML frontmatter block.",
        },
      ]
    `)
  })
})

describe('commit', () => {
  test('behavior: writes and deletes land in one commit', async () => {
    const instance = await github(
      {},
      {
        files: {
          [repo]: {
            'README.md': '# app',
            [`${dir}/gone/friction.md`]: entry('Resolved'),
            [`${dir}/stays/friction.md`]: entry('Filters ignored'),
          },
        },
      },
    )

    const sha = await Repository.commit(client(instance.url), {
      branch: 'main',
      deletes: [`${dir}/gone/friction.md`],
      message: 'chore: sync friction log',
      repo,
      writes: [
        { contents: entry('Filters ignored', 'Rewritten.'), path: `${dir}/stays/friction.md` },
      ],
    })

    expect(sha).toBeTruthy()
    expect(Object.keys(instance.files(repo)).sort()).toEqual([
      `${dir}/stays/friction.md`,
      'README.md',
    ])
    expect(instance.files(repo)[`${dir}/stays/friction.md`]).toContain('Rewritten.')
    // One commit, not one per file.
    expect(instance.messages(repo)).toEqual(['initial', 'chore: sync friction log'])
  })

  test('behavior: what it writes is what read gets back', async () => {
    const instance = await github({}, { files: { [repo]: { 'README.md': '# app' } } })
    const octokit = client(instance.url)

    await Repository.commit(octokit, {
      branch: 'main',
      message: 'chore: link friction log to issues',
      repo,
      writes: [{ contents: entry('Filters ignored'), path: `${dir}/a/friction.md` }],
    })

    const { entries } = await Repository.read(octokit, { repo })
    expect(entries).toEqual([
      { body: 'Body.', id: 'a', severity: 'minor', title: 'Filters ignored' },
    ])
  })

  test('behavior: nothing to do makes no commit', async () => {
    const instance = await github({}, { files: { [repo]: { 'README.md': '# app' } } })

    expect(
      await Repository.commit(client(instance.url), { branch: 'main', message: 'noop', repo }),
    ).toBeUndefined()
    expect(instance.messages(repo)).toEqual(['initial'])
  })

  test('behavior: deleting an absent path is not an error', async () => {
    const instance = await github({}, { files: { [repo]: { 'README.md': '# app' } } })

    await Repository.commit(client(instance.url), {
      branch: 'main',
      deletes: [`${dir}/never-existed/friction.md`],
      message: 'chore: sync friction log',
      repo,
    })

    expect(Object.keys(instance.files(repo))).toEqual(['README.md'])
  })
})
