import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { Octokit } from '@octokit/rest'
import type * as Github from '../../Github.js'

const exec = promisify(execFile)

/**
 * Resolves a GitHub token.
 *
 * Falls back to `gh auth token`, so anyone already logged in with the GitHub CLI can publish without
 * configuration.
 */
export async function token(options: token.Options): Promise<string | undefined> {
  const { env, token } = options
  if (token) return token
  if (env.GITHUB_TOKEN) return env.GITHUB_TOKEN
  if (env.GH_TOKEN) return env.GH_TOKEN

  const { stdout } = await exec('gh', ['auth', 'token']).catch(() => ({ stdout: '' }))
  return stdout.trim() || undefined
}

export declare namespace token {
  type Options = {
    env: {
      GH_TOKEN?: string | undefined
      GITHUB_TOKEN?: string | undefined
    }
    /** Explicit `--token`. Overrides every other source. */
    token?: string | undefined
  }
}

/** Builds a client. `baseUrl` comes from `GITHUB_API_URL`, which Actions sets. */
export function client(options: client.Options = {}): Github.Client {
  const { baseUrl, token } = options
  return new Octokit({ ...(token ? { auth: token } : {}), ...(baseUrl ? { baseUrl } : {}) }).rest
}

export declare namespace client {
  type Options = {
    baseUrl?: string | undefined
    /** Absent reads anonymously, which public repository config allows at a lower rate limit. */
    token?: string | undefined
  }
}
