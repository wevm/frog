import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import * as Github from './Github.js'

const exec = promisify(execFile)

/** Options shared by every git call. */
export type Options = {
  /** Directory to run git in. Defaults to `process.cwd()`. */
  cwd?: string | undefined
}

async function git(args: readonly string[], options: Options = {}): Promise<string> {
  const { stdout } = await exec('git', [...args], { cwd: options.cwd ?? process.cwd() })
  return stdout.trim()
}

/**
 * Absolute path of the repository root.
 *
 * @returns The root, or `undefined` outside a repository.
 */
export async function root(options: Options = {}): Promise<string | undefined> {
  try {
    return await git(['rev-parse', '--show-toplevel'], options)
  } catch {
    return undefined
  }
}

/**
 * Repository behind the `origin` remote.
 *
 * @returns `owner/name`, or `undefined` when there is no `origin` or it does not point at GitHub.
 * Recognizes ssh, scp, and https remote forms.
 */
export async function repo(options: Options = {}): Promise<string | undefined> {
  const url = await git(['remote', 'get-url', 'origin'], options).catch(() => '')
  return Github.parseRepository(url, { shorthand: false })
}

/**
 * Sha of the current commit.
 *
 * @returns The sha, or `undefined` in a repository with no commits.
 */
export async function head(options: Options = {}): Promise<string | undefined> {
  return git(['rev-parse', 'HEAD'], options).catch(() => undefined)
}

/**
 * Local committer name from git config.
 *
 * Used to attribute an entry that has not been committed yet, where there is no commit to read.
 *
 * @returns The name, or `undefined` when `user.name` is unset.
 */
export async function author(options: Options = {}): Promise<string | undefined> {
  const name = await git(['config', 'user.name'], options).catch(() => '')
  return name || undefined
}

/** Who added a file, and when. */
export type Provenance = {
  /** Commit author name. */
  author: string
  /** Author date, ISO 8601. */
  date: string
  /** Sha of the commit that added the file. */
  sha: string
}

/** Unit separator, so a name containing whitespace survives the split. */
const separator = '\u001f'

/**
 * Provenance of the commit that added `file`.
 *
 * Reads the commit that *added* the file, so a later edit does not reattribute the report.
 *
 * @param file - Repository-relative path.
 * @returns The provenance, or `undefined` for a file that is not committed yet, leaving the caller to
 * decide what an unknown reporter renders as.
 */
export async function provenance(
  file: string,
  options: Options = {},
): Promise<Provenance | undefined> {
  const line = await git(
    ['log', '--diff-filter=A', `--format=%H${separator}%an${separator}%aI`, '-1', '--', file],
    options,
  ).catch(() => '')
  if (!line) return undefined
  const [sha, author, date] = line.split(separator)
  if (!sha || !author || !date) return undefined
  return { author, date, sha }
}

/**
 * Paths under `dir` added or modified since `ref`.
 *
 * @param ref - Git ref to compare against, such as a branch name or sha.
 * @param dir - Repository-relative directory to limit the diff to.
 * @returns Repository-relative paths. Empty when nothing under `dir` changed.
 */
export async function changedSince(
  ref: string,
  dir: string,
  options: Options = {},
): Promise<readonly string[]> {
  const output = await git(
    ['diff', '--name-only', '--diff-filter=AM', `${ref}...HEAD`, '--', dir],
    options,
  )
  return output ? output.split('\n') : []
}

/**
 * Stages paths.
 *
 * @param files - Repository-relative paths. An empty list is a no-op.
 */
export async function add(files: readonly string[], options: Options = {}): Promise<void> {
  if (files.length === 0) return
  await git(['add', '--', ...files], options)
}

/**
 * Stages the removal of paths, deleting them from the working tree.
 *
 * Recursive, because an entry is a directory: git refuses a directory pathspec without `-r`.
 *
 * @param files - Repository-relative paths. An empty list is a no-op.
 */
export async function rm(files: readonly string[], options: rm.Options = {}): Promise<void> {
  if (files.length === 0) return
  const flags = options.ignoreUnmatch ? ['--ignore-unmatch'] : []
  await git(['rm', '--quiet', '-r', ...flags, '--', ...files], options)
}

export declare namespace rm {
  /** Options for {@link rm}. */
  type Options = {
    /** Directory to run git in. Defaults to `process.cwd()`. */
    cwd?: string | undefined
    /**
     * Succeed for paths git does not track.
     *
     * Reconciliation deletes entries that may never have been committed, where a strict `git rm`
     * would fail on the pathspec.
     */
    ignoreUnmatch?: boolean | undefined
  }
}

/**
 * Commits staged changes.
 *
 * @param message - Commit message.
 * @returns `true` when a commit was made, `false` when nothing was staged. Reporting rather than
 * throwing keeps a no-op run from looking like a failure.
 */
export async function commit(message: string, options: Options = {}): Promise<boolean> {
  const staged = await git(['diff', '--cached', '--name-only'], options)
  if (!staged) return false
  await git(['commit', '--no-verify', '--message', message], options)
  return true
}
