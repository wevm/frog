import type { Cache } from 'frog'

/**
 * Builds an in-memory cache.
 *
 * There is no filesystem here. A warm isolate spares repeated lookups of the same repository, and a
 * cold start fetches again.
 */
export function memory(store = new Map<string, string>()): Cache.Cache {
  return {
    async get(key) {
      return store.get(key)
    },
    async set(key, value) {
      store.set(key, value)
    },
  }
}
