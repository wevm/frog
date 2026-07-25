import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { Octokit } from '@octokit/rest'
import type * as Github from '../../Github.js'

const exec = promisify(execFile)

/**
 * Resolves a GitHub token.
 *
 * The `gh auth token` fallback is what makes the common local case need zero configuration: anyone
 * with the GitHub CLI already logged in can publish without setting anything up.
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
    /** Explicit `--token`, which wins over everything. */
    token?: string | undefined
  }
}

/** Builds a client. `baseUrl` comes from `GITHUB_API_URL`, which Actions sets for you. */
export function client(options: client.Options): Github.Client {
  const { baseUrl, token } = options
  return new Octokit({ auth: token, ...(baseUrl ? { baseUrl } : {}) }).rest
}

export declare namespace client {
  type Options = {
    baseUrl?: string | undefined
    token: string
  }
}
