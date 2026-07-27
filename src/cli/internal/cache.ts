import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { Cache } from '../../index.js'

/** Default cache location, honoring `XDG_CACHE_HOME`. */
export function dir(env: Record<string, string | undefined> = process.env): string {
  const base = env['XDG_CACHE_HOME'] || path.join(os.homedir(), '.cache')
  return path.join(base, 'frog')
}

/**
 * Caches to disk, so a consent lookup survives between runs.
 *
 * Every failure is swallowed: an unwritable cache slows a run, it does not fail one.
 */
export function file(root: string = dir()): Cache.Cache {
  return {
    async get(key) {
      return fs
        .readFile(path.join(root, `${encodeURIComponent(key)}.json`), 'utf8')
        .catch(() => undefined)
    },
    async set(key, value) {
      await fs.mkdir(root, { recursive: true }).catch(() => undefined)
      await fs
        .writeFile(path.join(root, `${encodeURIComponent(key)}.json`), value, 'utf8')
        .catch(() => undefined)
    },
  }
}
