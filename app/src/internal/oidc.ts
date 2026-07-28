const actorId = '309546769'
const issuer = 'https://token.actions.githubusercontent.com'
const jwksUrl = `${issuer}/.well-known/jwks`
const jwksCooldown = 30
const maxJwksBytes = 64 * 1_024
const maxTokenBytes = 16 * 1_024
const jwksTtl = 5 * 60

const eventNames = ['issue_comment', 'push', 'schedule', 'workflow_dispatch'] as const

/** A verified identity issued to the repository's Friction Log workflow. */
export type Claims = {
  actor_id: string
  aud: string
  event_name: (typeof eventNames)[number]
  exp: number
  iat: number
  iss: typeof issuer
  nbf: number
  ref: string
  ref_type: 'branch'
  repository: string
  repository_id: string
  sha: string
  workflow_ref: string
  workflow_sha: string
}

/** Verifies a GitHub Actions OIDC token against one trusted repository workflow. */
export async function verify(token: string, options: verify.Options): Promise<Claims> {
  try {
    return await verifyToken(token, options)
  } catch {
    throw new InvalidError()
  }
}

export declare namespace verify {
  type Options = {
    /** Exact audience requested by the Friction Log workflow. */
    audience: string
    /** Fetch implementation, injectable for deterministic tests. */
    fetch?: typeof globalThis.fetch
    /** Current Unix time, injectable for deterministic tests. */
    now?: () => number
  }
}

/** Binds signed claims to repository metadata read through the installation. */
export function bind(claims: Claims, options: bind.Options): Claims {
  if (
    claims.repository !== options.repository ||
    claims.repository_id !== options.repositoryId ||
    claims.ref !== options.ref
  )
    throw new InvalidError()
  return claims
}

export declare namespace bind {
  type Options = {
    /** Trusted branch ref, normally the repository's default branch. */
    ref: string
    /** Canonical `owner/repository` name read from GitHub. */
    repository: string
    /** Immutable GitHub repository id read from GitHub. */
    repositoryId: string
  }
}

async function verifyToken(token: string, options: verify.Options): Promise<Claims> {
  if (
    typeof token !== 'string' ||
    token.length === 0 ||
    token.length > maxTokenBytes ||
    !isString(options.audience)
  )
    throw new Error()

  const segments = token.split('.')
  if (segments.length !== 3) throw new Error()
  const [encodedHeader, encodedPayload, encodedSignature] = segments
  if (!encodedHeader || !encodedPayload || !encodedSignature) throw new Error()

  const header = parseObject(decodeBase64Url(encodedHeader))
  if (
    header['alg'] !== 'RS256' ||
    header['typ'] !== 'JWT' ||
    !isKeyId(header['kid']) ||
    header['crit'] !== undefined
  )
    throw new Error()

  const now = Math.floor((options.now ?? (() => Date.now() / 1_000))())
  if (!Number.isSafeInteger(now)) throw new Error()

  const key = await fetchKey(header['kid'], options.fetch ?? globalThis.fetch, now)
  const publicKey = await crypto.subtle.importKey(
    'jwk',
    key,
    { hash: 'SHA-256', name: 'RSASSA-PKCS1-v1_5' },
    false,
    ['verify'],
  )
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    publicKey,
    decodeBase64Url(encodedSignature),
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
  )
  if (!valid) throw new Error()

  const payload = parseObject(decodeBase64Url(encodedPayload))

  const eventName = payload['event_name']
  if (!isEventName(eventName)) throw new Error()

  const exp = payload['exp']
  const iat = payload['iat']
  const nbf = payload['nbf']
  if (
    !isNumericDate(exp) ||
    !isNumericDate(iat) ||
    !isNumericDate(nbf) ||
    exp <= now ||
    nbf > now ||
    iat > now ||
    nbf > iat ||
    iat >= exp
  )
    throw new Error()

  const sha = payload['sha']
  const workflowSha = payload['workflow_sha']
  if (!isSha(sha) || !isSha(workflowSha) || sha !== workflowSha) throw new Error()

  const actor = payload['actor_id']
  const repository = payload['repository']
  const repositoryId = payload['repository_id']
  const ref = payload['ref']
  if (!isRepository(repository) || !isId(repositoryId) || !isBranchRef(ref)) throw new Error()
  const workflowRef = `${repository}/.github/workflows/friction-log.yml@${ref}`
  if (
    payload['iss'] !== issuer ||
    payload['aud'] !== options.audience ||
    payload['ref_type'] !== 'branch' ||
    payload['workflow_ref'] !== workflowRef ||
    !isId(actor) ||
    (eventName === 'issue_comment' && actor !== actorId)
  )
    throw new Error()

  return {
    actor_id: actor,
    aud: options.audience,
    event_name: eventName,
    exp,
    iat,
    iss: issuer,
    nbf,
    ref,
    ref_type: 'branch',
    repository,
    repository_id: repositoryId,
    sha,
    workflow_ref: workflowRef,
    workflow_sha: workflowSha,
  }
}

type KeySet = {
  expiresAt: number
  keys: ReadonlyMap<string, JsonWebKey>
}

type KeySetState = {
  cached: KeySet | undefined
  refreshAfter: number
  refreshing: Promise<KeySet> | undefined
}

const keySetStates = new WeakMap<typeof globalThis.fetch, KeySetState>()

async function fetchKey(
  kid: string,
  fetch_: typeof globalThis.fetch,
  now: number,
): Promise<JsonWebKey> {
  let state = keySetStates.get(fetch_)
  if (!state) {
    state = {
      cached: undefined,
      refreshAfter: 0,
      refreshing: undefined,
    }
    keySetStates.set(fetch_, state)
  }

  let cached = state.cached
  let loaded = false
  if (!cached || cached.expiresAt <= now) {
    cached = await loadKeySet(state, fetch_, now)
    loaded = true
  }

  let key = cached.keys.get(kid)
  if (!key) {
    if (loaded) {
      // A fresh set already checked current keys; do not let an unknown id trigger a second request.
      state.refreshAfter = Math.max(state.refreshAfter, now + jwksCooldown)
      throw new Error()
    }
    cached = await refreshKeySet(state, fetch_, now)
    key = cached.keys.get(kid)
  }
  if (!key) throw new Error()
  return key
}

async function refreshKeySet(
  state: KeySetState,
  fetch_: typeof globalThis.fetch,
  now: number,
): Promise<KeySet> {
  // Key ids are attacker-controlled, so share refreshes and limit them independently of the cache TTL.
  if (state.refreshing) return state.refreshing
  if (state.refreshAfter > now) throw new Error()

  state.refreshAfter = now + jwksCooldown
  return loadKeySet(state, fetch_, now)
}

async function loadKeySet(
  state: KeySetState,
  fetch_: typeof globalThis.fetch,
  now: number,
): Promise<KeySet> {
  if (state.refreshing) return state.refreshing

  const refreshing = (async () => {
    const cached = {
      expiresAt: now + jwksTtl,
      keys: await fetchKeys(fetch_),
    }
    state.cached = cached
    return cached
  })()
  state.refreshing = refreshing

  try {
    return await refreshing
  } finally {
    if (state.refreshing === refreshing) state.refreshing = undefined
  }
}

async function fetchKeys(
  fetch_: typeof globalThis.fetch,
): Promise<ReadonlyMap<string, JsonWebKey>> {
  const response = await fetch_(jwksUrl, {
    headers: { accept: 'application/json' },
    redirect: 'error',
    signal: AbortSignal.timeout(5_000),
  })
  if (!response.ok) throw new Error()
  if (response.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json')
    throw new Error()

  const contentLength = response.headers.get('content-length')
  if (contentLength && (!/^\d+$/.test(contentLength) || Number(contentLength) > maxJwksBytes))
    throw new Error()

  const value = parseObject(await read(response, maxJwksBytes))
  if (!Array.isArray(value['keys']) || value['keys'].length === 0 || value['keys'].length > 16)
    throw new Error()

  const keys = new Map<string, JsonWebKey>()
  for (const item of value['keys']) {
    if (!isObject(item)) throw new Error()
    const kid = item['kid']
    if (
      !isKeyId(kid) ||
      keys.has(kid) ||
      item['kty'] !== 'RSA' ||
      item['alg'] !== 'RS256' ||
      item['use'] !== 'sig' ||
      !isBase64Url(item['n']) ||
      !isBase64Url(item['e']) ||
      decodeBase64Url(item['n']).byteLength < 256 ||
      (item['key_ops'] !== undefined &&
        (!Array.isArray(item['key_ops']) ||
          item['key_ops'].length !== 1 ||
          item['key_ops'][0] !== 'verify'))
    )
      throw new Error()
    keys.set(kid, {
      alg: 'RS256',
      e: item['e'],
      ext: true,
      key_ops: ['verify'],
      kty: 'RSA',
      n: item['n'],
      use: 'sig',
    })
  }
  return keys
}

async function read(response: Response, limit: number): Promise<Uint8Array> {
  if (!response.body) throw new Error()
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0

  while (true) {
    const result = await reader.read()
    if (result.done) break
    length += result.value.byteLength
    if (length > limit) {
      await reader.cancel()
      throw new Error()
    }
    chunks.push(result.value)
  }

  const value = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    value.set(chunk, offset)
    offset += chunk.byteLength
  }
  return value
}

function parseObject(value: Uint8Array): Record<string, unknown> {
  const decoded = new TextDecoder('utf-8', { fatal: true }).decode(value)
  const parsed: unknown = JSON.parse(decoded)
  if (!isObject(parsed)) throw new Error()
  return parsed
}

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  if (!isBase64Url(value)) throw new Error()
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
  const decoded = atob(`${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`)
  const bytes = new Uint8Array(decoded.length)
  for (let index = 0; index < decoded.length; index++) bytes[index] = decoded.charCodeAt(index)
  if (encodeBase64Url(bytes) !== value) throw new Error()
  return bytes
}

function encodeBase64Url(value: Uint8Array): string {
  let binary = ''
  for (const byte of value) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function isBase64Url(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length % 4 !== 1 &&
    /^[A-Za-z0-9_-]+$/.test(value)
  )
}

function isBranchRef(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('refs/heads/') && value !== 'refs/heads/'
}

function isEventName(value: unknown): value is Claims['event_name'] {
  return typeof value === 'string' && eventNames.some((name) => name === value)
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && /^[1-9]\d{0,19}$/.test(value)
}

function isKeyId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9._-]{1,128}$/.test(value)
}

function isNumericDate(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isRepository(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[A-Za-z0-9](?:[A-Za-z0-9.-]{0,38})\/[A-Za-z0-9_.-]{1,100}$/.test(value) &&
    !value.endsWith('.') &&
    !value.endsWith('/.')
  )
}

function isSha(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{40}$/.test(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

/** Indicates that a GitHub Actions identity could not be verified. */
export class InvalidError extends Error {
  override name = 'Oidc.InvalidError'

  constructor() {
    super('Invalid GitHub Actions identity.')
  }
}
