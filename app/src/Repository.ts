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

  // Entries are directories, so the write-up inside each one is what gets read.
  const directories = await Github.listDirectories(client.rest, {
    path: Store.dir,
    repo,
    ...(ref ? { ref } : {}),
  })

  const entries: Entry.Entry[] = []
  const malformed: { id: string; reason: string }[] = []

  for (const directory of directories) {
    // Validated through `toId` rather than by slicing the prefix off, so what counts as an entry is
    // decided in one place for both transports.
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
  const { branch, deletes = [], directories = [], message, repo, writes = [] } = options
  if (writes.length === 0 && deletes.length === 0 && directories.length === 0) return undefined

  const { owner, repo: name } = Github.split(repo)

  // The reconciling branch may not exist yet, and is created from `base` when it does not. Committing on
  // top of it when it does is what lets one pull request accumulate several closures.
  const reference = await client.rest.git
    .getRef({ owner, ref: `heads/${branch}`, repo: name })
    .catch((error: { status?: number }) => {
      if (error.status !== 404 || !options.base) throw error
      return undefined
    })

  const head =
    reference?.data.object.sha ??
    (
      await client.rest.git.getRef({
        owner,
        ref: `heads/${options.base as string}`,
        repo: name,
      })
    ).data.object.sha
  const parent = await client.rest.git.getCommit({ commit_sha: head, owner, repo: name })

  // A directory has to be expanded into its blobs: the API deletes paths, not trees. Read from the base
  // tree so an entry's artifacts go with its write-up.
  const removed = [...deletes]
  if (directories.length > 0) {
    const tree = await client.rest.git.getTree({
      owner,
      recursive: '1',
      repo: name,
      tree_sha: parent.data.tree.sha,
    })
    for (const item of tree.data.tree) {
      const itemPath = item.path
      if (item.type !== 'blob' || !itemPath) continue
      if (directories.some((directory) => itemPath.startsWith(`${directory}/`)))
        removed.push(itemPath)
    }
  }

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
      ...removed.map((path) => ({
        mode: '100644' as const,
        path,
        sha: null,
        type: 'blob' as const,
      })),
    ],
  })

  // Nothing to say. The plan is computed from the default branch, so a redelivery of one closed issue
  // re-plans a deletion the reconciling branch already made, and committing it would stack an empty
  // commit per delivery.
  if (tree.data.sha === parent.data.tree.sha) return undefined

  const created = await client.rest.git.createCommit({
    message,
    owner,
    parents: [head],
    repo: name,
    tree: tree.data.sha,
  })

  if (reference)
    await client.rest.git.updateRef({
      owner,
      ref: `heads/${branch}`,
      repo: name,
      sha: created.data.sha,
    })
  else
    await client.rest.git.createRef({
      owner,
      ref: `refs/heads/${branch}`,
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
    /** Branch to create `branch` from when it does not exist yet. Absent requires it to exist. */
    base?: string | undefined
    /** Repository-relative paths to delete. */
    deletes?: readonly string[] | undefined
    /** Repository-relative directories to delete, expanded to every file beneath them. */
    directories?: readonly string[] | undefined
    /** Commit message. */
    message: string
    /** Repository to commit to, as `owner/name`. */
    repo: string
    /** Files to write, replacing any existing contents. */
    writes?: readonly { contents: string; path: string }[] | undefined
  }
}

/**
 * Opens the reconciling pull request, or finds the one already open.
 *
 * One long-lived branch and one pull request, updated in place, so closing three issues produces one
 * review rather than three. The same shape the changesets bot uses for its version pull request.
 *
 * @param client - Installation client for the repository.
 * @returns The pull request number.
 */
export async function upsert(client: Octokit, options: upsert.Options): Promise<number> {
  const { base, branch, repo, title } = options
  const { owner, repo: name } = Github.split(repo)

  const open = await client.rest.pulls.list({
    base,
    head: `${owner}:${branch}`,
    owner,
    repo: name,
    state: 'open',
  })
  const existing = open.data[0]
  if (existing) return existing.number

  const created = await client.rest.pulls.create({
    base,
    body: options.body,
    head: branch,
    owner,
    repo: name,
    title,
  })
  return created.data.number
}

export declare namespace upsert {
  /** Options for {@link upsert}. */
  type Options = {
    /** Branch the pull request merges into. */
    base: string
    /** Branch the reconciling commits land on. */
    branch: string
    /** Description, used only when opening. */
    body: string
    /** Repository holding both branches, as `owner/name`. */
    repo: string
    /** Title, used only when opening. */
    title: string
  }
}
