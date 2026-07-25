import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

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

/** Absolute path of the repository root, or `undefined` outside a repository. */
export async function root(options: Options = {}): Promise<string | undefined> {
  try {
    return await git(['rev-parse', '--show-toplevel'], options)
  } catch {
    return undefined
  }
}

/** Matches GitHub remotes in ssh, scp, and https form. */
const remoteRegex = /github\.com[:/]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/

/** `owner/name` from the `origin` remote, or `undefined` when it is missing or not GitHub. */
export async function repo(options: Options = {}): Promise<string | undefined> {
  const url = await git(['remote', 'get-url', 'origin'], options).catch(() => '')
  const match = remoteRegex.exec(url)
  if (!match) return undefined
  const [, owner, name] = match
  return `${owner}/${name}`
}

/** Current commit sha, or `undefined` in a repository with no commits. */
export async function head(options: Options = {}): Promise<string | undefined> {
  return git(['rev-parse', 'HEAD'], options).catch(() => undefined)
}

/** Local committer name from git config, or `undefined` when unset. */
export async function author(options: Options = {}): Promise<string | undefined> {
  const name = await git(['config', 'user.name'], options).catch(() => '')
  return name || undefined
}

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
 * Returns `undefined` for a file that is not committed yet, leaving the caller to decide what an
 * unknown reporter renders as.
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

/** Paths under `dir` added or modified since `ref`. */
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

/** Stages paths. */
export async function add(files: readonly string[], options: Options = {}): Promise<void> {
  if (files.length === 0) return
  await git(['add', '--', ...files], options)
}

/** Stages the removal of paths. */
export async function rm(files: readonly string[], options: Options = {}): Promise<void> {
  if (files.length === 0) return
  await git(['rm', '--quiet', '--', ...files], options)
}

/** Commits staged changes. Returns `false` when there was nothing staged. */
export async function commit(message: string, options: Options = {}): Promise<boolean> {
  const staged = await git(['diff', '--cached', '--name-only'], options)
  if (!staged) return false
  await git(['commit', '--no-verify', '--message', message], options)
  return true
}
