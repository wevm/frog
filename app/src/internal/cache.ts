import type { Cache } from 'frog'

/**
 * A cache in memory.
 *
 * There is no filesystem here. An isolate stays warm across deliveries, so this still spares repeated
 * lookups of the same host, and a cold start simply fetches again.
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
