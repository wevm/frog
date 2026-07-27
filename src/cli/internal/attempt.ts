export type Attempt<value> =
  | { ok: true; value: value }
  | { code: string; message: string; ok: false; status?: number | undefined }

/**
 * Runs `promise`, returning a failure instead of throwing.
 *
 * Works around a sharp edge in incur: `c.error()` is typed `=> never` but does not throw, and its
 * sentinel is recognised only as the return value of `run`, so `return c.error(...)` from inside a
 * nested closure or a `.catch()` silently becomes ordinary data. Wrapping the fallible call keeps every
 * `c.error()` at the top level of `run`, where it works.
 *
 * Picks up the `code` on Frog's own error classes, so a domain error keeps its machine-readable code
 * without the core depending on incur.
 */
export async function attempt<value>(promise: Promise<value>): Promise<Attempt<value>> {
  try {
    return { ok: true, value: await promise }
  } catch (error) {
    const failure = error as Error & { code?: string; status?: number }
    return {
      code: failure.code ?? 'UNKNOWN',
      message: failure.message,
      ok: false,
      // Octokit puts the HTTP status here.
      ...(typeof failure.status === 'number' ? { status: failure.status } : {}),
    }
  }
}
