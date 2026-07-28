/**
 * Checks whether a request body contains no bytes.
 *
 * Cloudflare may expose a non-null stream for a zero-byte POST. A one-byte BYOB read avoids buffering
 * an attacker-controlled body, and any stream error fails closed.
 */
export async function empty(body: ReadableStream<Uint8Array> | null): Promise<boolean> {
  if (!body) return true

  try {
    const reader = body.getReader({ mode: 'byob' })
    const result = await reader.read(new Uint8Array(1))
    if (!result.done) await reader.cancel()
    return result.done
  } catch {
    return false
  }
}
