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

/**
 * Applies writes and deletions as a single commit.
 *
 * Uses the git data API. The contents API would emit one commit per file.
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

  // Creates the reconciling branch from `base` when it does not exist yet. Committing on top of an
  // existing branch lets one pull request accumulate several closures.
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

  // Expand a directory into its blobs: the API deletes paths, not trees. Read from the base tree so an
  // entry's artifacts go with its write-up.
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

  // Each blob carries its own path out of the promise.
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
      // The API expresses a deletion as a null sha against a base tree.
      ...removed.map((path) => ({
        mode: '100644' as const,
        path,
        sha: null,
        type: 'blob' as const,
      })),
    ],
  })

  // Nothing to say. A plan built against a ref other than the one it commits to, or a redelivery,
  // would otherwise stack an empty commit per delivery.
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
 * Finds the reconciling pull request, when one is open.
 *
 * Asked before committing. An open pull request means the branch carries pending state worth building
 * on, and none means it is the leftover of a merge.
 *
 * @param client - Installation client for the repository.
 * @returns The number, or `undefined` when nothing is open.
 */
export async function review(
  client: Octokit,
  options: review.Options,
): Promise<number | undefined> {
  const { base, branch, repo } = options
  const { owner, repo: name } = Github.split(repo)

  const open = await client.rest.pulls.list({
    base,
    head: `${owner}:${branch}`,
    owner,
    repo: name,
    state: 'open',
  })
  return open.data[0]?.number
}

export declare namespace review {
  /** Options for {@link review}. */
  type Options = {
    /** Branch the pull request merges into. */
    base: string
    /** Branch the reconciling commits land on. */
    branch: string
    /** Repository holding both, as `owner/name`. */
    repo: string
  }
}

/**
 * Points a branch back at its base, discarding whatever it held.
 *
 * A squash merge leaves the branch on a history the base no longer descends from, where restoring an
 * entry produces no diff at all and is silently lost. Resetting first keeps a retained branch from
 * corrupting the next reconciliation.
 *
 * @param client - Installation client for the repository.
 * @returns Whether a branch was there to reset.
 */
export async function reset(client: Octokit, options: review.Options): Promise<boolean> {
  const { base, branch, repo } = options
  const { owner, repo: name } = Github.split(repo)

  const target = await client.rest.git
    .getRef({ owner, ref: `heads/${branch}`, repo: name })
    .catch((error: { status?: number }) => {
      if (error.status === 404) return undefined
      throw error
    })
  if (!target) return false

  const source = await client.rest.git.getRef({ owner, ref: `heads/${base}`, repo: name })
  if (target.data.object.sha === source.data.object.sha) return true

  await client.rest.git.updateRef({
    force: true,
    owner,
    ref: `heads/${branch}`,
    repo: name,
    sha: source.data.object.sha,
  })
  return true
}

/**
 * Opens the reconciling pull request, or finds the one already open.
 *
 * Keeps one long-lived branch and one pull request, updated in place, so closing three issues produces
 * one review. Matches the changesets bot's version pull request.
 *
 * @param client - Installation client for the repository.
 * @returns The pull request number.
 */
export async function upsert(client: Octokit, options: upsert.Options): Promise<number> {
  const { base, branch, repo, title } = options
  const { owner, repo: name } = Github.split(repo)

  const existing = await review(client, { base, branch, repo })
  if (existing) {
    // Rewrite the description each time. The branch accumulates closures across deliveries.
    await client.rest.pulls.update({ body: options.body, owner, pull_number: existing, repo: name })
    return existing
  }

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
    /** Description. Rewritten on every reconciliation to describe the whole branch. */
    body: string
    /** Repository holding both branches, as `owner/name`. */
    repo: string
    /** Title, used only when opening. */
    title: string
  }
}
