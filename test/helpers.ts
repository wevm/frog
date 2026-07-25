import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const exec = promisify(execFile)

/**
 * Creates a temporary directory, removed when the test finishes.
 *
 * The path is realpath'd because macOS puts `os.tmpdir()` behind a symlink, and `git rev-parse
 * --show-toplevel` reports the resolved path.
 */
export async function tmpdir(): Promise<string> {
  const dir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'frictionsets-')))
  onTestFinished(() => fs.rm(dir, { force: true, recursive: true }))
  return dir
}

/** Runs git in `cwd`, returning trimmed stdout. */
export async function git(args: readonly string[], cwd: string): Promise<string> {
  const { stdout } = await exec('git', [...args], { cwd })
  return stdout.trim()
}

/** Creates a temporary repository with a committer identity configured. */
export async function repo(options: repo.Options = {}): Promise<string> {
  const dir = await tmpdir()
  await git(['init', '--initial-branch=main'], dir)
  await git(['config', 'user.name', 'Test User'], dir)
  await git(['config', 'user.email', 'test@example.com'], dir)
  if (options.remote) await git(['remote', 'add', 'origin', options.remote], dir)
  return dir
}

export declare namespace repo {
  type Options = {
    /** Added as the `origin` remote. */
    remote?: string | undefined
  }
}

/** Writes a file, creating parent directories. */
export async function writeFile(file: string, contents: string, cwd: string): Promise<void> {
  await fs.mkdir(path.dirname(path.join(cwd, file)), { recursive: true })
  await fs.writeFile(path.join(cwd, file), contents, 'utf8')
}

/** Stages everything and commits. */
export async function commit(message: string, cwd: string): Promise<string> {
  await git(['add', '--all'], cwd)
  await git(['commit', '--no-verify', '--message', message], cwd)
  return git(['rev-parse', 'HEAD'], cwd)
}
