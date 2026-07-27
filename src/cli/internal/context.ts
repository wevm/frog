import { z } from 'incur'
import * as Config from '../../Config.js'
import * as Git from '../../Git.js'

export type Context = {
  config: Config.Config
  /** `owner/name` this repository's own friction is filed against, if it can be determined. */
  repo: string | undefined
  /** Repository root, falling back to the working directory outside a repository. */
  root: string
}

/**
 * Resolves the repository root and config.
 *
 * The origin remote is threaded in as a default, keeping `Config` a pure normalizer.
 */
export async function resolve(options: resolve.Options = {}): Promise<Context> {
  const cwd = options.cwd ?? process.cwd()
  const root = (await Git.root({ cwd })) ?? cwd
  const remote = await Git.repo({ cwd: root })
  const config = await Config.resolve({
    root,
    ...(remote ? { defaults: { repo: remote } } : {}),
  })
  return { config, repo: config.repo, root }
}

export declare namespace resolve {
  type Options = {
    /** Directory to resolve from. Defaults to `process.cwd()`. */
    cwd?: string | undefined
  }
}

/** The `--cwd` option, shared by every command that touches the repository. */
export const cwdOption = z
  .string()
  .min(1)
  .optional()
  .describe('Directory to run in. Defaults to the working directory.')
