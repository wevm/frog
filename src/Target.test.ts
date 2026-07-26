import type * as Config from './Config.js'
import * as Target from './Target.js'

const self = 'acme/app'
const upstream = 'wevm/viem'

describe('classify', () => {
  test.for([
    ['viem', 'npm', 'viem'],
    ['@scope/pkg', 'npm', '@scope/pkg'],
    ['lodash.merge', 'npm', 'lodash.merge'],
    ['wevm/viem', 'repo', 'wevm/viem'],
  ] as const)('behavior: %s classifies as %s', ([value, kind, name]) => {
    expect(Target.classify(value)).toEqual({ kind, name })
  })
})

describe('resolve', () => {
  /** Resolver stack backed by plain data, since resolution is all policy and no transport. */
  function options(overrides: Partial<Target.resolve.Options> = {}): Target.resolve.Options {
    return {
      allowedRepos: [],
      readConfig: async () => undefined,
      readRepo: async () => undefined,
      self,
      ...overrides,
    }
  }

  /** A target that has committed its consent. */
  function accepts(inbound: Partial<Config.Inbound> = {}) {
    return async () => ({ enabled: true, ...inbound })
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
    test('behavior: resolves through the repository the package declares', async () => {
      const result = await Target.resolve(
        'viem',
        options({
          allowedRepos: [upstream],
          readConfig: accepts(),
          readRepo: async () => upstream,
        }),
      )
      expect(result).toEqual({ ok: true, target: { kind: 'npm', repo: upstream } })
    })

    // The package names the repository; the repository decides. A package pointing somewhere that has
    // not opted in cannot redirect a report there.
    test('error: a package whose repository has not opted in', async () => {
      const result = await Target.resolve(
        'viem',
        options({ allowedRepos: [upstream], readRepo: async () => upstream }),
      )
      expect(result.ok === false && result.code).toBe('TARGET_NOT_ACCEPTING')
      expect(result.ok === false && result.message).toContain('has not opted in')
    })

    test('error: a package that declares no repository', async () => {
      const result = await Target.resolve('viem', options())
      expect(result.ok === false && result.code).toBe('TARGET_UNKNOWN')
      expect(result.ok === false && result.message).toContain('is not installed')
    })

    test('behavior: a scoped package resolves the same way', async () => {
      const result = await Target.resolve(
        '@scope/pkg',
        options({
          allowedRepos: [upstream],
          readConfig: accepts(),
          readRepo: async () => upstream,
        }),
      )
      expect(result.ok).toBe(true)
    })

    test('behavior: the package resolves to this repository', async () => {
      const result = await Target.resolve(
        'app',
        options({ readConfig: accepts(), readRepo: async () => self }),
      )
      expect(result).toEqual({ ok: true, target: { kind: 'self', repo: self } })
    })
  })

  describe('repositories', () => {
    test('behavior: an explicit repository that accepts inbound friction', async () => {
      const result = await Target.resolve(
        upstream,
        options({ allowedRepos: [upstream], readConfig: accepts() }),
      )
      expect(result).toEqual({ ok: true, target: { kind: 'repo', repo: upstream } })
    })

    // Naming a repository directly must not be a way around the receiver gate.
    test('error: an explicit repository with no committed config', async () => {
      const result = await Target.resolve(upstream, options({ allowedRepos: [upstream] }))
      expect(result.ok === false && result.code).toBe('TARGET_NOT_ACCEPTING')
      expect(result.ok === false && result.message).toContain('has not opted in')
    })

    test('error: an explicit repository that has opted out', async () => {
      const result = await Target.resolve(
        upstream,
        options({ allowedRepos: [upstream], readConfig: async () => ({ enabled: false }) }),
      )
      expect(result.ok === false && result.code).toBe('TARGET_NOT_ACCEPTING')
    })

    test('error: rejects a repository target with extra path segments before lookup', async () => {
      let looked = false
      const result = await Target.resolve(
        'wevm/viem/tree/main',
        options({
          allowedRepos: ['wevm/*'],
          readConfig: async () => {
            looked = true
            return { enabled: true }
          },
        }),
      )
      expect(result).toEqual({
        code: 'TARGET_UNKNOWN',
        message: '`wevm/viem/tree/main` is not a repository. Name it as `owner/name`.',
        ok: false,
      })
      expect(looked).toBe(false)
    })
  })

  describe('urls', () => {
    test.for(['https://viem.sh', 'http://localhost:3000'] as const)(
      'error: %s names no repository',
      async (value) => {
        const result = await Target.resolve(value, options())
        expect(result.ok === false && result.code).toBe('TARGET_UNKNOWN')
        expect(result.ok === false && result.message).toContain('Name the repository behind it')
      },
    )

    test('behavior: a url costs no lookup', async () => {
      let looked = false
      await Target.resolve(
        'https://viem.sh',
        options({
          readRepo: async () => {
            looked = true
            return undefined
          },
        }),
      )
      expect(looked).toBe(false)
    })
  })

  describe('gates', () => {
    test('error: the sender is not on the receiver allowFrom list', async () => {
      const result = await Target.resolve(
        upstream,
        options({
          allowedRepos: [upstream],
          readConfig: accepts({ allowFrom: ['other/*'] }),
        }),
      )
      expect(result.ok === false && result.code).toBe('SENDER_NOT_ALLOWED')
    })

    test('behavior: an allowFrom glob matching the sender', async () => {
      const result = await Target.resolve(
        upstream,
        options({ allowedRepos: [upstream], readConfig: accepts({ allowFrom: ['acme/*'] }) }),
      )
      expect(result.ok).toBe(true)
    })

    test('error: the target is not on the sender allowedRepos list', async () => {
      const result = await Target.resolve(upstream, options({ readConfig: accepts() }))
      expect(result.ok === false && result.code).toBe('TARGET_NOT_ALLOWED')
    })

    test('behavior: an allowedRepos glob matching the target', async () => {
      const result = await Target.resolve(
        upstream,
        options({ allowedRepos: ['wevm/*'], readConfig: accepts() }),
      )
      expect(result.ok).toBe(true)
    })

    test('behavior: the receiver labels reach the target', async () => {
      const result = await Target.resolve(
        upstream,
        options({
          allowedRepos: [upstream],
          readConfig: accepts({ labels: ['friction', 'from-consumer'] }),
        }),
      )
      expect(result).toEqual({
        ok: true,
        target: { kind: 'repo', labels: ['friction', 'from-consumer'], repo: upstream },
      })
    })
  })
})
