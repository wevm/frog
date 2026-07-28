/** Safe error fields emitted to Worker logs. */
export type Failure = {
  /** Nested failures carried by an aggregate error. */
  errors?: readonly Failure[] | undefined
  /** Error message, which must not contain request credentials. */
  message?: string | undefined
  /** Error class name. */
  name: string
  /** HTTP status exposed by request errors. */
  status?: number | undefined
}

const maximumDepth = 3
const maximumErrors = 5
const maximumMessage = 500

/** Reduces an error to diagnostic fields without logging requests, responses, or credentials. */
export function from(error: unknown): Failure {
  return summarize(error, { depth: 0, seen: new Set() })
}

function summarize(error: unknown, options: { depth: number; seen: Set<object> }): Failure {
  const value =
    error && (typeof error === 'object' || typeof error === 'function')
      ? (error as { message?: unknown; name?: unknown; status?: unknown })
      : {}
  if (error && typeof error === 'object') {
    if (options.seen.has(error)) return { name: name(value.name) }
    options.seen.add(error)
  }

  const errors =
    error instanceof AggregateError && Array.isArray(error.errors) && options.depth < maximumDepth
      ? error.errors
          .slice(0, maximumErrors)
          .map((nested) => summarize(nested, { depth: options.depth + 1, seen: options.seen }))
      : undefined
  const message =
    error instanceof Error && typeof value.status === 'number' && typeof value.message === 'string'
      ? redact(value.message)
      : undefined

  return {
    name: name(value.name),
    ...(message ? { message } : {}),
    ...(typeof value.status === 'number' ? { status: value.status } : {}),
    ...(errors?.length ? { errors } : {}),
  }
}

function name(value: unknown): string {
  return typeof value === 'string' ? value : 'UnknownError'
}

function redact(value: string): string {
  return value
    .slice(0, maximumMessage * 4)
    .replace(
      /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g,
      '[REDACTED]',
    )
    .replace(/([?&](?:access_token|api_key|key|secret|token)=)[^&\s]+/gi, '$1[REDACTED]')
    .replace(/\b(?:gh[pousr]|github_pat)_[A-Za-z0-9_.-]+\b/g, '[REDACTED]')
    .replace(/\b(Bearer|Basic|token)\s+\S+/gi, '$1 [REDACTED]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED]')
    .slice(0, maximumMessage)
}
