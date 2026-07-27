import fs from 'node:fs/promises'
import { z } from 'incur'
import { tmpdir, writeFile } from '../test/helpers.js'
import * as Config from './Config.js'

describe('from', () => {
  test('behavior: applies every default', () => {
    expect(Config.from({})).toMatchInlineSnapshot(`
      {
        "inbound": {
          "enabled": false,
        },
        "labels": [
          "friction",
        ],
        "maxPerRun": 10,
        "outbound": {
          "allowedRepos": [],
          "enabled": true,
        },
        "pullRequest": {
          "branch": "frog/sync",
          "enabled": true,
        },
      }
    `)
  })

  test('behavior: fills nested defaults around a partial override', () => {
    expect(Config.from({ inbound: { labels: ['dx'] } })).toMatchObject({
      inbound: { enabled: false, labels: ['dx'] },
    })
  })

  test('behavior: written config wins over derived defaults', () => {
    expect(Config.from({ repo: 'wevm/ox' }, { defaults: { repo: 'wevm/viem' } }).repo).toBe(
      'wevm/ox',
    )
  })

  test('behavior: derived defaults fill what is not written', () => {
    expect(Config.from({}, { defaults: { repo: 'wevm/viem' } }).repo).toBe('wevm/viem')
  })

  test('behavior: strips unknown keys such as $schema', () => {
    expect(Config.from({ $schema: 'https://unpkg.com/frog/schema.json' })).not.toHaveProperty(
      '$schema',
    )
  })

  test('error: rejects a non-object', () => {
    expect(() => Config.from([])).toThrowErrorMatchingInlineSnapshot(
      `[Config.InvalidError: \`.agents/friction-log/config.json\` is invalid. Expected an object.]`,
    )
  })

  test('error: rejects a malformed repo', () => {
    expect(() => Config.from({ repo: 'viem' })).toThrowErrorMatchingInlineSnapshot(
      `[Config.InvalidError: \`.agents/friction-log/config.json\` is invalid. repo: Invalid string: must match pattern /^[\\w.-]+\\/[\\w.-]+$/]`,
    )
  })

  test.each([
    ['inbound.allowFrom', { inbound: { allowFrom: ['acme/*/typo'] } }],
    ['outbound.allowedRepos', { outbound: { allowedRepos: ['wevm/*/typo'] } }],
  ])('error: rejects a malformed %s entry', (_, value) => {
    expect(() => Config.from(value)).toThrow(Config.InvalidError)
  })

  test('error: rejects a non-positive maxPerRun', () => {
    expect(() => Config.from({ maxPerRun: 0 })).toThrowErrorMatchingInlineSnapshot(
      `[Config.InvalidError: \`.agents/friction-log/config.json\` is invalid. maxPerRun: Too small: expected number to be >0]`,
    )
  })
})

describe('resolve', () => {
  test('behavior: a missing file yields defaults', async () => {
    expect(await Config.resolve({ root: await tmpdir() })).toEqual(Config.from({}))
  })

  test('behavior: reads and normalizes the file', async () => {
    const root = await tmpdir()
    await writeFile(
      Config.file,
      JSON.stringify({ maxPerRun: 3, outbound: { allowedRepos: ['wevm/viem'] } }),
      root,
    )
    expect(await Config.resolve({ root })).toMatchObject({
      maxPerRun: 3,
      outbound: { allowedRepos: ['wevm/viem'], enabled: true },
    })
  })

  test('error: unparseable JSON', async () => {
    const root = await tmpdir()
    await writeFile(Config.file, '{ nope', root)
    await expect(Config.resolve({ root })).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Config.MalformedError: \`.agents/friction-log/config.json\` is not valid JSON.]`,
    )
  })
})

test('schema.json matches the written config schema', async () => {
  const committed = JSON.parse(
    await fs.readFile(new URL('../schema.json', import.meta.url), 'utf8'),
  ) as unknown
  const generated = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'frog config',
    ...z.toJSONSchema(Config.Schema, { io: 'input', target: 'draft-7' }),
  }

  expect(committed).toEqual(generated)
})

describe('allows', () => {
  const sender = 'acme/app'

  test.for<[Config.Inbound, string | undefined, boolean]>([
    // A project that has not opted in accepts nothing, whatever else it says.
    [{ enabled: false }, sender, false],
    [{ allowFrom: [sender], enabled: false }, sender, false],
    // Opted in with no allowlist accepts anyone, including a sender that cannot name itself.
    [{ enabled: true }, sender, true],
    [{ enabled: true }, undefined, true],
    [{ allowFrom: [], enabled: true }, sender, true],
    // An allowlist is exact, or an `owner/*` glob.
    [{ allowFrom: [sender], enabled: true }, sender, true],
    [{ allowFrom: ['other/app'], enabled: true }, sender, false],
    [{ allowFrom: ['acme/*'], enabled: true }, 'acme/other', true],
    [{ allowFrom: ['acme/*'], enabled: true }, 'other/app', false],
    // An allowlist cannot match a sender that is unknown.
    [{ allowFrom: [sender], enabled: true }, undefined, false],
  ])('behavior: %o from %s', ([inbound, from, expected]) => {
    expect(Config.allows(inbound, from)).toBe(expected)
  })
})
