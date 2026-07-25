import { Config, Github } from 'frictionsets'
import type { Octokit } from 'octokit'

/**
 * Reads a repository's config.
 *
 * Always from a branch, never from a pull request head. A pull request must not get to say where its
 * issues go, who may receive them, or whether filing upstream is automatic.
 *
 * @param client - Installation client for the repository.
 * @returns Normalized config. A missing or unparseable file yields defaults, so a repository with no
 * config still works rather than failing closed on every event.
 */
export async function read(client: Octokit, options: read.Options): Promise<Config.Config> {
  const { ref, repo } = options

  const contents = await Github.fetchFile(client.rest, {
    path: Config.file,
    repo,
    ...(ref ? { ref } : {}),
  }).catch(() => undefined)

  try {
    return contents ? Config.from(JSON.parse(contents)) : Config.from({})
  } catch {
    return Config.from({})
  }
}

export declare namespace read {
  /** Options for {@link read}. */
  type Options = {
    /** Branch to read from. Defaults to the repository's default branch. */
    ref?: string | undefined
    /** Repository to read from, as `owner/name`. */
    repo: string
  }
}
