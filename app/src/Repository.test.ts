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
