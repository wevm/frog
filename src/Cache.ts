/** How long a cached entry stays good. */
export const ttl = 24 * 60 * 60 * 1000

/**
 * Storage for the answers to network lookups.
 *
 * Injected because the CLI caches to disk across runs and the App runs where there is no filesystem.
 * Keeping the implementation out of this module keeps `node:fs` out of a Workers bundle.
 */
export type Cache = {
  /**
   * Reads a cached entry.
   *
   * @param key - What was looked up.
   */
  get: (key: string) => Promise<string | undefined>
  /**
   * Writes a cached entry. Failures are swallowed.
   *
   * @param key - What was looked up.
   * @param value - Serialized entry.
   */
  set: (key: string, value: string) => Promise<void>
}

/**
 * Reads a cached value, ignoring one that has expired.
 *
 * @param key - What was looked up.
 * @param now - Current time, so expiry is testable.
 * @returns The cached value, or `undefined` when absent, expired, or unreadable.
 */
export async function read<value>(
  cache: Cache,
  key: string,
  now: number,
): Promise<value | undefined> {
  const contents = await cache.get(key).catch(() => undefined)
  if (!contents) return undefined

  const entry = (() => {
    try {
      return JSON.parse(contents) as { at?: number; value?: value }
    } catch {
      return undefined
    }
  })()
  if (!entry?.at || entry.value === undefined || now - entry.at > ttl) return undefined
  return entry.value
}

/**
 * Caches a value.
 *
 * Callers are expected to cache definitive absences too.
 *
 * @param key - What was looked up.
 * @param at - Time of the lookup.
 */
export async function write<value>(
  cache: Cache,
  key: string,
  value: value,
  at: number,
): Promise<void> {
  await cache.set(key, JSON.stringify({ at, value })).catch(() => undefined)
}
