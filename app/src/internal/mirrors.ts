import { Github, Mirrors } from 'frog'
import type { Octokit } from 'octokit'

/** Reads a repository's committed mirror recovery journal. */
export async function read(client: Octokit, options: read.Options): Promise<Mirrors.State> {
  const contents = await Github.fetchFile(client.rest, {
    path: Mirrors.file,
    repo: options.repo,
    ...(options.ref ? { ref: options.ref } : {}),
  })
  if (contents === undefined) return Mirrors.empty()

  try {
    return Mirrors.from(JSON.parse(contents))
  } catch (error) {
    if (error instanceof Mirrors.InvalidError) throw error
    throw new Mirrors.MalformedError(error as Error)
  }
}

export declare namespace read {
  type Options = {
    /** Branch to read from. Defaults to the repository's default branch. */
    ref?: string | undefined
    /** Repository holding the journal. */
    repo: string
  }
}
