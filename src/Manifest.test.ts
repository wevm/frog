import fs from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { tmpdir } from '../test/helpers.js'
import * as Manifest from './Manifest.js'

const repo = 'wevm/viem'

describe('from', () => {
  test('behavior: normalizes the minimal document', () => {
    expect(Manifest.from({ repo })).toMatchInlineSnapshot(`
      {
        "inbound": {
          "enabled": true,
        },
        "packages": [],
        "repo": "wevm/viem",
      }
    `)
  })

  test('behavior: accepts `inbound: true` as shorthand', () => {
    expect(Manifest.from({ inbound: true, repo })?.inbound).toEqual({ enabled: true })
  })

  test('behavior: accepts `inbound: false`', () => {
    expect(Manifest.from({ inbound: false, repo })?.inbound.enabled).toBe(false)
  })

  test('behavior: accepts the long inbound form', () => {
    expect(
      Manifest.from({ inbound: { allowFrom: ['wevm/*'], labels: ['dx'] }, repo })?.inbound,
    ).toEqual({ allowFrom: ['wevm/*'], enabled: true, labels: ['dx'] })
  })

  test('behavior: top-level labels are shorthand for the nested form', () => {
    expect(Manifest.from({ labels: ['friction'], repo })?.inbound.labels).toEqual(['friction'])
  })

  test('behavior: a name implies the package it speaks for', () => {
    expect(Manifest.from({ name: 'viem', repo })?.packages).toEqual(['viem'])
  })

  test.for([
    [undefined, 'nothing'],
    [{}, 'no repo'],
    [{ repo: 'viem' }, 'a malformed repo'],
    [{ repo, version: 2 }, 'an unsupported version'],
    ['a string', 'a non-object'],
    [[], 'an array'],
  ] as const)('behavior: rejects %o (%s)', ([value]) => {
    expect(Manifest.from(value)).toBeUndefined()
  })

  test('behavior: accepts the supported version explicitly', () => {
    expect(Manifest.from({ repo, version: 1 })?.repo).toBe(repo)
  })
})

describe('render', () => {
  test('behavior: renders a servable document', () => {
    expect(
      Manifest.render({
        docs: 'https://viem.sh/docs/frog',
        labels: ['friction'],
        name: 'viem',
        packages: ['viem', 'ox'],
        repo,
      }),
    ).toMatchInlineSnapshot(`
      {
        "docs": "https://viem.sh/docs/frog",
        "inbound": true,
        "labels": [
          "friction",
        ],
        "name": "viem",
        "packages": [
          "viem",
          "ox",
        ],
        "repo": "wevm/viem",
        "version": 1,
      }
    `)
  })

  test('behavior: what it renders is what `from` accepts', () => {
    const rendered = Manifest.render({ name: 'viem', packages: ['viem'], repo })
    expect(Manifest.from(rendered)).toEqual({
      inbound: { enabled: true },
      name: 'viem',
      packages: ['viem'],
      repo,
    })
  })
})

describe('fromPackage', () => {
  async function install(root: string, name: string, contents: unknown): Promise<void> {
    const dir = path.join(root, 'node_modules', name)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify(contents), 'utf8')
  }

  test('behavior: reads the field from an installed package', async () => {
    const root = await tmpdir()
    await install(root, 'viem', { frog: { inbound: true, repo }, name: 'viem' })

    expect(await Manifest.fromPackage('viem', { root })).toEqual({
      inbound: { enabled: true },
      name: 'viem',
      packages: ['viem'],
      repo,
    })
  })

  test('behavior: reads a scoped package', async () => {
    const root = await tmpdir()
    await install(root, '@scope/pkg', { frog: { repo: 'acme/pkg' } })

    expect((await Manifest.fromPackage('@scope/pkg', { root }))?.name).toBe('@scope/pkg')
  })

  test('behavior: undefined for a package that is not installed', async () => {
    expect(await Manifest.fromPackage('absent', { root: await tmpdir() })).toBeUndefined()
  })

  test('behavior: undefined for a package declaring nothing', async () => {
    const root = await tmpdir()
    await install(root, 'viem', { name: 'viem' })
    expect(await Manifest.fromPackage('viem', { root })).toBeUndefined()
  })

  test('behavior: undefined for unparseable json', async () => {
    const root = await tmpdir()
    const dir = path.join(root, 'node_modules', 'viem')
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, 'package.json'), '{ nope', 'utf8')
    expect(await Manifest.fromPackage('viem', { root })).toBeUndefined()
  })
})

describe('fetchDocument', () => {
  /** An in-memory cache, so these tests never touch a real directory. */
  function store(): Manifest.Cache {
    const entries = new Map<string, string>()
    return {
      async get(key) {
        return entries.get(key)
      },
      async set(key, value) {
        entries.set(key, value)
      },
    }
  }

  /** Serves a well-known document, or a status, over real HTTP. */
  async function host(handler: (url: URL) => { body?: string; status: number }): Promise<string> {
    const server = http.createServer((request, response) => {
      const { body, status } = handler(new URL(request.url ?? '/', 'http://localhost'))
      response.writeHead(status, { 'content-type': 'application/json' })
      response.end(body ?? '')
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    onTestFinished(() => new Promise<void>((resolve) => server.close(() => resolve())))

    const address = server.address()
    if (address === null || typeof address === 'string') throw new Error('Server has no port.')
    return `http://127.0.0.1:${address.port}`
  }

  test('behavior: fetches and normalizes a document', async () => {
    const url = await host((request) =>
      request.pathname === `/${Manifest.wellKnown}`
        ? { body: JSON.stringify({ inbound: true, name: 'viem', repo, version: 1 }), status: 200 }
        : { status: 404 },
    )

    const lookup = await Manifest.fetchDocument(url)
    expect(lookup.ok && lookup.manifest).toMatchObject({ name: 'viem', repo })
  })

  test('behavior: reports a 404 rather than throwing', async () => {
    const url = await host(() => ({ status: 404 }))
    const lookup = await Manifest.fetchDocument(url)
    expect(lookup).toMatchObject({ ok: false })
    expect(lookup.ok === false && lookup.reason).toContain('404')
  })

  test('behavior: reports a malformed document', async () => {
    const url = await host(() => ({ body: JSON.stringify({ nope: true }), status: 200 }))
    const lookup = await Manifest.fetchDocument(url)
    expect(lookup.ok === false && lookup.reason).toContain('not a valid frog manifest')
  })

  test('behavior: reports an unreachable host', async () => {
    const lookup = await Manifest.fetchDocument('127.0.0.1:1')
    expect(lookup).toMatchObject({ ok: false })
  })

  test('behavior: rejects an unusable host', async () => {
    const lookup = await Manifest.fetchDocument('not a host')
    expect(lookup.ok === false && lookup.reason).toContain('not a valid host')
  })

  test('behavior: a second call is served from the cache', async () => {
    let requests = 0
    const url = await host(() => {
      requests += 1
      return { body: JSON.stringify({ repo, version: 1 }), status: 200 }
    })
    const cache = store()

    await Manifest.fetchDocument(url, { cache })
    await Manifest.fetchDocument(url, { cache })
    expect(requests).toBe(1)
  })

  test('behavior: a failure is cached too, so an absent manifest is not re-probed', async () => {
    let requests = 0
    const url = await host(() => {
      requests += 1
      return { status: 404 }
    })
    const cache = store()

    await Manifest.fetchDocument(url, { cache })
    await Manifest.fetchDocument(url, { cache })
    expect(requests).toBe(1)
  })

  test('behavior: omitting the cache fetches every time', async () => {
    let requests = 0
    const url = await host(() => {
      requests += 1
      return { body: JSON.stringify({ repo, version: 1 }), status: 200 }
    })
    await Manifest.fetchDocument(url)
    await Manifest.fetchDocument(url)
    expect(requests).toBe(2)
  })

  test('behavior: an expired entry is fetched again', async () => {
    let requests = 0
    const url = await host(() => {
      requests += 1
      return { body: JSON.stringify({ repo, version: 1 }), status: 200 }
    })
    const cache = store()

    await Manifest.fetchDocument(url, { cache, now: 0 })
    await Manifest.fetchDocument(url, { cache, now: Manifest.cacheTtl + 1 })
    expect(requests).toBe(2)
  })
})

describe('corroborate', () => {
  const manifest = { inbound: { enabled: true }, packages: ['viem'], repo } as const

  test('behavior: a repository that accepts inbound friction confirms the claim', () => {
    expect(Manifest.corroborate(manifest, { accepts: true })).toBe(true)
  })

  test('behavior: a package pointing back confirms the claim', () => {
    expect(
      Manifest.corroborate(manifest, {
        packages: [{ inbound: { enabled: true }, name: 'viem', packages: ['viem'], repo }],
      }),
    ).toBe(true)
  })

  // The attack: a host names a repository it does not speak for.
  test('behavior: no evidence refuses the claim', () => {
    expect(Manifest.corroborate(manifest, {})).toBe(false)
  })

  test('behavior: a package pointing at another repository does not confirm', () => {
    expect(
      Manifest.corroborate(manifest, {
        packages: [
          { inbound: { enabled: true }, name: 'viem', packages: ['viem'], repo: 'attacker/repo' },
        ],
      }),
    ).toBe(false)
  })

  test('behavior: a package the document does not name does not confirm', () => {
    expect(
      Manifest.corroborate(manifest, {
        packages: [{ inbound: { enabled: true }, name: 'other', packages: ['other'], repo }],
      }),
    ).toBe(false)
  })
})

describe('allows', () => {
  test.for([
    [{ enabled: true }, 'acme/app', true, 'open to anyone'],
    [{ enabled: false }, 'acme/app', false, 'closed'],
    [{ allowFrom: ['acme/app'], enabled: true }, 'acme/app', true, 'an exact match'],
    [{ allowFrom: ['acme/app'], enabled: true }, 'other/app', false, 'a non-match'],
    [{ allowFrom: ['acme/*'], enabled: true }, 'acme/anything', true, 'an owner glob'],
    [{ allowFrom: ['acme/*'], enabled: true }, 'other/app', false, 'a different owner'],
    [{ allowFrom: ['acme/app'], enabled: true }, undefined, false, 'an unknown sender'],
    [{ enabled: true }, undefined, true, 'an unknown sender when open to anyone'],
  ] as const)('behavior: %s from %s is %s (%s)', ([inbound, sender, expected]) => {
    expect(Manifest.allows(inbound, sender)).toBe(expected)
  })
})
