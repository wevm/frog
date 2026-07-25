export type Attempt<value> =
  | { ok: true; value: value }
  | { code: string; message: string; ok: false }

/**
 * Runs `promise`, returning a failure instead of throwing.
 *
 * This exists because of a sharp edge in incur: `c.error()` is typed `=> never` but does not throw.
 * It returns a sentinel that is only recognised when it is the return value of `run`, so
 * `return c.error(...)` from inside a nested closure or a `.catch()` silently becomes ordinary data.
 * Wrapping the fallible call means every `c.error()` can stay at the top level of `run`, where it
 * works.
 *
 * The `code` on our own error classes is picked up here, which is how a domain error keeps its
 * machine-readable code without the core having to depend on incur.
 */
export async function attempt<value>(promise: Promise<value>): Promise<Attempt<value>> {
  try {
    return { ok: true, value: await promise }
  } catch (error) {
    const failure = error as Error & { code?: string }
    return { code: failure.code ?? 'UNKNOWN', message: failure.message, ok: false }
  }
}
