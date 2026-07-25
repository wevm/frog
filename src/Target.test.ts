import type * as Manifest from './Manifest.js'
import * as Target from './Target.js'

const self = 'acme/app'

describe('classify', () => {
  test.for([
    ['viem', ['npm'], 'viem'],
    ['@scope/pkg', ['npm'], '@scope/pkg'],
    ['wevm/viem', ['repo'], 'wevm/viem'],
    ['https://viem.sh', ['host'], 'https://viem.sh'],
    ['http://localhost:3000', ['host'], 'http://localhost:3000'],
    ['npm:lodash.merge', ['npm'], 'lodash.merge'],
    // The one genuine ambiguity: a package name and a hostname are indistinguishable by shape.
    ['viem.sh', ['npm', 'host'], 'viem.sh'],
    ['lodash.merge', ['npm', 'host'], 'lodash.merge'],
  ] as const)('behavior: %s classifies as %o', ([value, kinds, name]) => {
    expect(Target.classify(value)).toEqual({ kinds, name })
  })
})

describe('resolve', () => {
  /** Resolver stack backed by plain data, since resolution is all policy and no transport. */
  function options(overrides: Partial<Target.resolve.Options> = {}): Target.resolve.Options {
    return {
      allowedRepos: [],
      readConfig: async () => undefined,
      readHost: async () => ({ ok: false, reason: 'no document' }),
      readPackage: async () => undefined,
      self,
      ...overrides,
    }
  }

  function manifest(overrides: Partial<Manifest.Manifest> = {}): Manifest.Manifest {
    return { inbound: { enabled: true }, packages: [], repo: 'wevm/viem', ...overrides }
  }

  test('behavior: no target means this repository', async () => {
    expect(await Target.resolve(undefined, options())).toEqual({
      ok: true,
      target: { kind: 'self', repo: self },
    })
  })

  test('behavior: naming this repository costs no lookup', async () => {
    let looked = false
    const result = await Target.resolve(
      self,
      options({
        readConfig: async () => {
          looked = true
          return undefined
        },
      }),
    )
    expect(result).toEqual({ ok: true, target: { kind: 'self', repo: self } })
    expect(looked).toBe(false)
  })

  test('error: no target and no repository', async () => {
    const result = await Target.resolve(undefined, options({ self: undefined }))
    expect(result.ok === false && result.code).toBe('NO_REPO')
  })

  describe('packages', () => {
    test('behavior: resolves an installed package', async () => {
      const result = await Target.resolve(
        'viem',
        options({
          allowedRepos: ['wevm/viem'],
          readPackage: async () => manifest({ inbound: { enabled: true, labels: ['dx'] } }),
        }),
      )
      expect(result).toEqual({
        ok: true,
        target: { kind: 'npm', labels: ['dx'], repo: 'wevm/viem' },
      })
    })

    test('behavior: a package is trusted without corroboration', async () => {
      let read = false
      await Target.resolve(
        'viem',
        options({
          allowedRepos: ['wevm/viem'],
          readConfig: async () => {
            read = true
            return undefined
          },
          readPackage: async () => manifest(),
        }),
      )
      // The manifest shipped in the tarball the consumer installed; it cannot name someone else's repo.
      expect(read).toBe(false)
    })

    test('error: a package that is not installed', async () => {
      const result = await Target.resolve('viem', options())
      expect(result.ok === false && result.code).toBe('TARGET_NOT_ACCEPTING')
      expect(result.ok === false && result.message).toContain('not installed')
    })

    test('error: a package that has opted out', async () => {
      const result = await Target.resolve(
        'viem',
        options({ readPackage: async () => manifest({ inbound: { enabled: false } }) }),
      )
      expect(result.ok === false && result.code).toBe('TARGET_NOT_ACCEPTING')
    })

    test('error: a sender the receiver does not allow', async () => {
      const result = await Target.resolve(
        'viem',
        options({
          readPackage: async () => manifest({ inbound: { allowFrom: ['wevm/*'], enabled: true } }),
        }),
      )
      expect(result.ok === false && result.code).toBe('SENDER_NOT_ALLOWED')
    })

    test('error: a target the sender has not allowlisted', async () => {
      const result = await Target.resolve('viem', options({ readPackage: async () => manifest() }))
      expect(result.ok === false && result.code).toBe('TARGET_NOT_ALLOWED')
    })

    test('behavior: an owner glob satisfies the allowlist', async () => {
      const result = await Target.resolve(
        'viem',
        options({ allowedRepos: ['wevm/*'], readPackage: async () => manifest() }),
      )
      expect(result.ok).toBe(true)
    })
  })

  describe('repositories', () => {
    test('behavior: an explicit repository that accepts inbound friction', async () => {
      const result = await Target.resolve(
        'wevm/viem',
        options({ allowedRepos: ['wevm/viem'], readConfig: async () => ({ enabled: true }) }),
      )
      expect(result).toEqual({ ok: true, target: { kind: 'repo', repo: 'wevm/viem' } })
    })

    // Naming a repository directly must not be a way around the receiver gate.
    test('error: an explicit repository with no committed config', async () => {
      const result = await Target.resolve('wevm/viem', options({ allowedRepos: ['wevm/viem'] }))
      expect(result.ok === false && result.code).toBe('TARGET_NOT_ACCEPTING')
      expect(result.ok === false && result.message).toContain('no committed frictionsets config')
    })

    test('error: an explicit repository that has opted out', async () => {
      const result = await Target.resolve(
        'wevm/viem',
        options({ allowedRepos: ['wevm/viem'], readConfig: async () => ({ enabled: false }) }),
      )
      expect(result.ok === false && result.code).toBe('TARGET_NOT_ACCEPTING')
    })
  })

  describe('hosts', () => {
    const hosted = manifest({ packages: ['viem'] })

    test('behavior: a host corroborated by the repository it names', async () => {
      const result = await Target.resolve(
        'viem.sh',
        options({
          allowedRepos: ['wevm/viem'],
          readConfig: async () => ({ enabled: true }),
          readHost: async () => ({ manifest: hosted, ok: true }),
        }),
      )
      expect(result).toEqual({ ok: true, target: { kind: 'host', repo: 'wevm/viem' } })
    })

    test('behavior: a host corroborated by a package pointing back', async () => {
      const result = await Target.resolve(
        'viem.sh',
        options({
          allowedRepos: ['wevm/viem'],
          readHost: async () => ({ manifest: hosted, ok: true }),
          readPackage: async (name) =>
            name === 'viem' ? manifest({ name: 'viem', packages: ['viem'] }) : undefined,
        }),
      )
      expect(result.ok).toBe(true)
    })

    // The attack the corroboration rule exists to stop: a site aiming consumers at another repository.
    test('error: a host claiming a repository that does not confirm it', async () => {
      const result = await Target.resolve(
        'evil.example',
        options({
          allowedRepos: ['wevm/viem'],
          readHost: async () => ({ manifest: manifest({ repo: 'wevm/viem' }), ok: true }),
        }),
      )
      expect(result.ok === false && result.code).toBe('TARGET_NOT_CORROBORATED')
    })

    test('error: a host claiming a repository whose package points elsewhere', async () => {
      const result = await Target.resolve(
        'evil.example',
        options({
          allowedRepos: ['wevm/viem'],
          readHost: async () => ({ manifest: hosted, ok: true }),
          // Only answers for the package the document names, not for the host name itself.
          readPackage: async (name) =>
            name === 'viem' ? manifest({ name: 'viem', repo: 'attacker/repo' }) : undefined,
        }),
      )
      expect(result.ok === false && result.code).toBe('TARGET_NOT_CORROBORATED')
    })

    test('error: a host serving no document', async () => {
      const result = await Target.resolve('viem.sh', options())
      expect(result.ok === false && result.code).toBe('TARGET_NOT_ACCEPTING')
    })
  })

  describe('the ambiguous dotted name', () => {
    test('behavior: an installed package wins over a host lookup', async () => {
      let probed = false
      const result = await Target.resolve(
        'lodash.merge',
        options({
          allowedRepos: ['wevm/viem'],
          readHost: async () => {
            probed = true
            return { ok: false, reason: 'no document' }
          },
          readPackage: async () => manifest(),
        }),
      )
      expect(result.ok && result.target.kind).toBe('npm')
      expect(probed).toBe(false)
    })

    test('behavior: falls through to a host when nothing is installed', async () => {
      const result = await Target.resolve(
        'viem.sh',
        options({
          allowedRepos: ['wevm/viem'],
          readConfig: async () => ({ enabled: true }),
          readHost: async () => ({ manifest: manifest({ packages: ['viem'] }), ok: true }),
        }),
      )
      expect(result.ok && result.target.kind).toBe('host')
    })

    test('error: reports both reasons when neither resolves', async () => {
      const result = await Target.resolve('viem.sh', options())
      expect(result.ok === false && result.message).toMatchInlineSnapshot(
        `"Cannot report friction to \`viem.sh\`: \`viem.sh\` is not installed, or declares no \`frictionsets\` field; no document."`,
      )
    })
  })
})
