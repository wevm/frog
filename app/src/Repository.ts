import { Entry, Github, Store } from 'frog'
import type { Octokit } from 'octokit'

/** Entries read from a ref, and the files that would not parse. */
export type Contents = {
  /** Entries that parsed. */
  entries: readonly Entry.Entry[]
  /** Ids of entries that did not parse, with the reason. */
  malformed: readonly { id: string; reason: string }[]
}

/**
 * Reads every entry at a ref through the API instead of cloning.
 *
 * The App has no working copy, and could not check out a fork's head.
 *
 * Collects a file that fails to parse rather than throwing, so one broken entry does not hide the rest.
 *
 * @param client - Installation client for the repository.
 * @returns Parsed entries, and anything that failed to parse.
 */
export async function read(client: Octokit, options: read.Options): Promise<Contents> {
  const { ref, repo } = options

  // Each entry is a directory containing the write-up to read.
  const directories = await Github.listDirectories(client.rest, {
    path: Store.dir,
    repo,
    ...(ref ? { ref } : {}),
  })

  const entries: Entry.Entry[] = []
  const malformed: { id: string; reason: string }[] = []

  for (const directory of directories) {
    // Validated through `toId` rather than by slicing the prefix off. One definition of an entry
    // serves both transports.
    const id = Store.toId(`${directory}/${Store.filename}`)
    if (!id) continue

    const contents = await Github.fetchFile(client.rest, {
      path: Store.toPath(id),
      repo,
      ...(ref ? { ref } : {}),
    })
    if (contents === undefined) continue

    try {
      entries.push(Entry.parse(contents, { id }))
    } catch (error) {
      malformed.push({ id, reason: (error as Error).message })
    }
  }

  return { entries, malformed }
}

export declare namespace read {
  /** Options for {@link read}. */
  type Options = {
    /** Commit, branch, or tag to read at. Defaults to the repository's default branch. */
    ref?: string | undefined
    /** Repository to read from, as `owner/name`. */
    repo: string
  }
}
