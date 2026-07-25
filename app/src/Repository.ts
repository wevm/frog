import { Entry, Github, Store } from 'frog'
import type { Octokit } from 'octokit'

/** Entries read from a ref, and the files that would not parse. */
export type Contents = {
  /** Entries that parsed. */
  entries: readonly Entry.Entry[]
  /** Ids of entries that did not parse, with the reason, for reporting back on the pull request. */
  malformed: readonly { id: string; reason: string }[]
}

/**
 * Reads every entry at a ref, without cloning.
 *
 * Not cloning is what lets this read a pull request head at all: the App holds an installation, not a
 * working copy, and a fork's head is not a branch it could check out.
 *
 * A file that fails to parse is collected rather than thrown, so one broken entry does not hide the
 * rest and the contributor can be told which one it was.
 *
 * @param client - Installation client for the repository.
 * @returns Parsed entries, and anything that failed to parse.
 */
export async function read(client: Octokit, options: read.Options): Promise<Contents> {
  const { ref, repo } = options

  const files = await Github.listFiles(client.rest, {
    path: Store.dir,
    repo,
    ...(ref ? { ref } : {}),
  })

  const entries: Entry.Entry[] = []
  const malformed: { id: string; reason: string }[] = []

  for (const file of files) {
    const id = Store.toId(file)
    if (!id) continue

    const contents = await Github.fetchFile(client.rest, {
      path: file,
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

/**
 * Writes and deletions applied as a single commit.
 *
 * Built through the git data API rather than the contents API, which would emit one commit per file.
 * One tree and one commit keeps a reconciliation of ten entries from looking like ten changes.
 *
 * @param client - Installation client for the repository.
 * @returns The new commit's sha, or `undefined` when there was nothing to do.
 */
export async function commit(
  client: Octokit,
  options: commit.Options,
): Promise<string | undefined> {
  const { branch, deletes = [], message, repo, writes = [] } = options
  if (writes.length === 0 && deletes.length === 0) return undefined

  const { owner, repo: name } = Github.split(repo)

  const reference = await client.rest.git.getRef({ owner, ref: `heads/${branch}`, repo: name })
  const head = reference.data.object.sha
  const parent = await client.rest.git.getCommit({ commit_sha: head, owner, repo: name })

  // Each blob carries its own path out of the promise, so there is no index to line back up.
  const blobs = await Promise.all(
    writes.map(async (write) => {
      const blob = await client.rest.git.createBlob({
        content: Buffer.from(write.contents, 'utf8').toString('base64'),
        encoding: 'base64',
        owner,
        repo: name,
      })
      return { path: write.path, sha: blob.data.sha }
    }),
  )

  const tree = await client.rest.git.createTree({
    base_tree: parent.data.tree.sha,
    owner,
    repo: name,
    tree: [
      ...blobs.map((blob) => ({
        mode: '100644' as const,
        path: blob.path,
        sha: blob.sha,
        type: 'blob' as const,
      })),
      // A null sha against a base tree is how the API expresses a deletion.
      ...deletes.map((path) => ({
        mode: '100644' as const,
        path,
        sha: null,
        type: 'blob' as const,
      })),
    ],
  })

  const created = await client.rest.git.createCommit({
    message,
    owner,
    parents: [head],
    repo: name,
    tree: tree.data.sha,
  })

  await client.rest.git.updateRef({
    owner,
    ref: `heads/${branch}`,
    repo: name,
    sha: created.data.sha,
  })

  return created.data.sha
}

export declare namespace commit {
  /** Options for {@link commit}. */
  type Options = {
    /** Branch to commit on, without a `refs/heads/` prefix. */
    branch: string
    /** Repository-relative paths to delete. */
    deletes?: readonly string[] | undefined
    /** Commit message. */
    message: string
    /** Repository to commit to, as `owner/name`. */
    repo: string
    /** Files to write, replacing any existing contents. */
    writes?: readonly { contents: string; path: string }[] | undefined
  }
}
