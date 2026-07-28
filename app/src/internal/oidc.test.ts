import * as Oidc from './oidc.js'

const now = 1_700_000_000
const repository = 'acme/source'
const repositoryId = '123456'
const ref = 'refs/heads/main'
const sha = 'a'.repeat(40)

let privateKey: CryptoKey
let publicKey: JsonWebKey & { kid: string }

beforeAll(async () => {
  const pair = await crypto.subtle.generateKey(
    {
      hash: 'SHA-256',
      modulusLength: 2_048,
      name: 'RSASSA-PKCS1-v1_5',
      publicExponent: new Uint8Array([1, 0, 1]),
    },
    true,
    ['sign', 'verify'],
  )
  privateKey = pair.privateKey
  publicKey = {
    ...(await crypto.subtle.exportKey('jwk', pair.publicKey)),
    alg: 'RS256',
    kid: 'test-key',
    use: 'sig',
  } as JsonWebKey & { kid: string }
})

function claims(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    actor_id: '1234',
    aud: 'frog.test',
    event_name: 'push',
    exp: now + 300,
    iat: now - 1,
    iss: 'https://token.actions.githubusercontent.com',
    nbf: now - 1,
    ref,
    ref_type: 'branch',
    repository,
    repository_id: repositoryId,
    sha,
    workflow_ref: `${repository}/.github/workflows/friction-log.yml@${ref}`,
    workflow_sha: sha,
    ...overrides,
  }
}

async function token(
  payload: Record<string, unknown> = claims(),
  header: Record<string, unknown> = { alg: 'RS256', kid: 'test-key', typ: 'JWT' },
  key: CryptoKey = privateKey,
): Promise<string> {
  const encodedHeader = encode(JSON.stringify(header))
  const encodedPayload = encode(JSON.stringify(payload))
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
  )
  return `${encodedHeader}.${encodedPayload}.${encode(new Uint8Array(signature))}`
}

function encode(value: string | Uint8Array): string {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function fetchJwks(
  keys: readonly (JsonWebKey & { kid?: string })[] = [publicKey],
): typeof globalThis.fetch {
  return vi.fn(async () => {
    const body = JSON.stringify({ keys })
    return new Response(body, {
      headers: {
        'content-length': String(new TextEncoder().encode(body).byteLength),
        'content-type': 'application/json',
      },
    })
  })
}

function options(overrides: Partial<Oidc.verify.Options> = {}): Oidc.verify.Options {
  return {
    audience: 'frog.test',
    fetch: fetchJwks(),
    now: () => now,
    ...overrides,
  }
}

test('behavior: verifies a token signed by GitHub for the trusted workflow', async () => {
  const fetch = fetchJwks()

  await expect(Oidc.verify(await token(), options({ fetch }))).resolves.toEqual(claims())
  expect(fetch).toHaveBeenCalledWith(
    'https://token.actions.githubusercontent.com/.well-known/jwks',
    expect.objectContaining({
      headers: { accept: 'application/json' },
      redirect: 'error',
    }),
  )
})

test('security: caches the bounded GitHub signing-key set', async () => {
  const fetch = fetchJwks()
  const verify = options({ fetch })

  await Oidc.verify(await token(), verify)
  await Oidc.verify(await token(), verify)

  expect(fetch).toHaveBeenCalledOnce()
})

test('security: binds signed identity to trusted repository metadata', async () => {
  const verified = await Oidc.verify(await token(), options())
  const trusted = { ref, repository, repositoryId }

  expect(Oidc.bind(verified, trusted)).toBe(verified)
  expect(() => Oidc.bind(verified, { ...trusted, repository: 'acme/other' })).toThrow(
    'Invalid GitHub Actions identity.',
  )
  expect(() => Oidc.bind(verified, { ...trusted, repositoryId: '654321' })).toThrow(
    'Invalid GitHub Actions identity.',
  )
  expect(() => Oidc.bind(verified, { ...trusted, ref: 'refs/heads/other' })).toThrow(
    'Invalid GitHub Actions identity.',
  )
})

test('security: issue comments must be initiated by the stable Frog bot identity', async () => {
  await expect(
    Oidc.verify(
      await token(claims({ actor_id: '309546769', event_name: 'issue_comment' })),
      options(),
    ),
  ).resolves.toMatchObject({
    actor_id: '309546769',
    event_name: 'issue_comment',
  })
  await expect(
    Oidc.verify(await token(claims({ event_name: 'issue_comment' })), options()),
  ).rejects.toThrowError('Invalid GitHub Actions identity.')
})

test.each(['push', 'schedule', 'workflow_dispatch'])(
  'behavior: accepts the %s workflow event without restricting its actor',
  async (event_name) => {
    await expect(
      Oidc.verify(await token(claims({ actor_id: '987654', event_name })), options()),
    ).resolves.toMatchObject({ actor_id: '987654', event_name })
  },
)

test.each([
  ['issuer', { iss: 'https://attacker.test' }],
  ['audience', { aud: ['frog.test'] }],
  ['expiration', { exp: now }],
  ['not-before time', { nbf: now + 1 }],
  ['issued-at time', { iat: now + 1 }],
  ['repository', { repository: '../other' }],
  ['repository id', { repository_id: '0' }],
  ['ref', { ref: 'refs/pull/1/merge' }],
  ['ref type', { ref_type: 'tag' }],
  ['commit sha', { sha: 'invalid' }],
  ['workflow sha', { workflow_sha: 'b'.repeat(40) }],
  ['workflow ref', { workflow_ref: `${repository}/.github/workflows/other.yml@${ref}` }],
  ['event', { event_name: 'pull_request' }],
])('security: rejects an invalid %s claim', async (_name, override) => {
  await expect(Oidc.verify(await token(claims(override)), options())).rejects.toThrowError(
    'Invalid GitHub Actions identity.',
  )
})

test.each([
  ['algorithm', { alg: 'none', kid: 'test-key', typ: 'JWT' }],
  ['type', { alg: 'RS256', kid: 'test-key', typ: 'JOSE' }],
  ['key id', { alg: 'RS256', kid: '', typ: 'JWT' }],
  ['critical extension', { alg: 'RS256', crit: ['custom'], kid: 'test-key', typ: 'JWT' }],
])('security: rejects an invalid JOSE %s', async (_name, header) => {
  await expect(Oidc.verify(await token(claims(), header), options())).rejects.toThrowError(
    'Invalid GitHub Actions identity.',
  )
})

test('security: rejects a forged signature and an ambiguous signing key', async () => {
  const attacker = await crypto.subtle.generateKey(
    {
      hash: 'SHA-256',
      modulusLength: 2_048,
      name: 'RSASSA-PKCS1-v1_5',
      publicExponent: new Uint8Array([1, 0, 1]),
    },
    true,
    ['sign', 'verify'],
  )
  const duplicate = { ...publicKey }

  await expect(
    Oidc.verify(await token(claims(), undefined, attacker.privateKey), options()),
  ).rejects.toThrowError('Invalid GitHub Actions identity.')
  await expect(
    Oidc.verify(
      await token(),
      options({
        fetch: fetchJwks([publicKey, duplicate]),
      }),
    ),
  ).rejects.toThrowError('Invalid GitHub Actions identity.')
})

test('security: bounds the fetched signing-key document', async () => {
  const oversized = vi.fn(async () => {
    const body = JSON.stringify({ keys: [], padding: 'x'.repeat(64 * 1_024) })
    return new Response(body, {
      headers: { 'content-type': 'application/json' },
    })
  })

  await expect(Oidc.verify(await token(), options({ fetch: oversized }))).rejects.toThrowError(
    'Invalid GitHub Actions identity.',
  )
})
