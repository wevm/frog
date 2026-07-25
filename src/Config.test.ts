import { tmpdir, writeFile } from '../test/helpers.js'
import * as Config from './Config.js'

describe('from', () => {
  test('behavior: applies every default', () => {
    expect(Config.from({})).toMatchInlineSnapshot(`
      {
        "commit": true,
        "inbound": {
          "enabled": false,
        },
        "labels": [
          "friction",
        ],
        "maxPerRun": 10,
        "outbound": {
          "allowedRepos": [],
          "auto": false,
        },
        "publishOnLog": false,
        "severityLabels": {
          "blocker": "friction:blocker",
          "major": "friction:major",
          "minor": "friction:minor",
        },
        "sync": {
          "closeOnDelete": false,
        },
      }
    `)
  })

  test('behavior: fills nested defaults around a partial override', () => {
    expect(
      Config.from({ inbound: { labels: ['dx'] }, severityLabels: { minor: 'nit' } }),
    ).toMatchObject({
      inbound: { enabled: false, labels: ['dx'] },
      severityLabels: { blocker: 'friction:blocker', major: 'friction:major', minor: 'nit' },
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
    expect(
      Config.from({ $schema: 'https://unpkg.com/frictionsets/schema.json' }),
    ).not.toHaveProperty('$schema')
  })

  test('error: rejects a non-object', () => {
    expect(() => Config.from([])).toThrowErrorMatchingInlineSnapshot(
      `[Config.InvalidError: \`.agents/frictionsets/config.json\` is invalid. Expected an object.]`,
    )
  })

  test('error: rejects a malformed repo', () => {
    expect(() => Config.from({ repo: 'viem' })).toThrowErrorMatchingInlineSnapshot(
      `[Config.InvalidError: \`.agents/frictionsets/config.json\` is invalid. repo: Invalid string: must match pattern /^[\\w.-]+\\/[\\w.-]+$/]`,
    )
  })

  test('error: rejects a non-positive maxPerRun', () => {
    expect(() => Config.from({ maxPerRun: 0 })).toThrowErrorMatchingInlineSnapshot(
      `[Config.InvalidError: \`.agents/frictionsets/config.json\` is invalid. maxPerRun: Too small: expected number to be >0]`,
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
      outbound: { allowedRepos: ['wevm/viem'], auto: false },
    })
  })

  test('error: unparseable JSON', async () => {
    const root = await tmpdir()
    await writeFile(Config.file, '{ nope', root)
    await expect(Config.resolve({ root })).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Config.MalformedError: \`.agents/frictionsets/config.json\` is not valid JSON.]`,
    )
  })
})
