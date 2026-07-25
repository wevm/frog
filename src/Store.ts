import fs from 'node:fs/promises'
import path from 'node:path'
import * as Entry from './Entry.js'

/** Directory holding entries, relative to the repository root. */
export const dir = '.agents/friction-log'

/** Files in `dir` that are documentation or config, never entries. */
const ignored = new Set(['AGENTS.md', 'CLAUDE.md', 'GEMINI.md', 'README.md', 'TEMPLATE.md'])

/** Options shared by every store operation. */
export type Options = {
  /** Repository root. Entries live in `<root>/.agents/friction-log`. */
  root: string
}

/**
 * Path of an entry file, relative to the repository root.
 *
 * @param id - Entry id, without the `.md` extension.
 * @returns The repository-relative path.
 */
export function toPath(id: string): string {
  return `${dir}/${id}.md`
}

/**
 * Id of the entry a repository-relative path refers to.
 *
 * The inverse of {@link toPath}, and the filter that decides whether a changed file in a pull request
 * is an entry at all.
 *
 * @param file - Repository-relative path.
 * @returns The id, or `undefined` for anything that is not an entry: a nested path, a dotfile, or one
 * of the documentation files that live alongside entries.
 */
export function toId(file: string): string | undefined {
  const name = file.startsWith(`${dir}/`) ? file.slice(dir.length + 1) : undefined
  if (!name || name.includes('/') || !isEntry(name)) return undefined
  return name.slice(0, -3)
}

function isEntry(name: string): boolean {
  return name.endsWith('.md') && !name.startsWith('.') && !ignored.has(name)
}

/**
 * Reads and parses every entry, sorted by id.
 *
 * @returns Every entry. Throws on the first malformed file rather than skipping it, so a broken entry
 * cannot go unnoticed.
 */
export async function read(options: Options): Promise<readonly Entry.Entry[]> {
  const ids = await list(options)
  return Promise.all(ids.map((id) => get(id, options)))
}

/**
 * Ids of every entry, sorted.
 *
 * @returns Entry ids. A missing directory yields an empty list rather than an error, so a repository
 * that has never logged friction is not a failure case.
 */
export async function list(options: Options): Promise<readonly string[]> {
  const names = await fs.readdir(path.join(options.root, dir)).catch((error) => {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  })
  return names
    .filter(isEntry)
    .map((name) => name.slice(0, -3))
    .sort()
}

/**
 * Reads and parses one entry.
 *
 * @param id - Entry id, without the `.md` extension.
 */
export async function get(id: string, options: Options): Promise<Entry.Entry> {
  const contents = await fs.readFile(path.join(options.root, toPath(id)), 'utf8')
  return Entry.parse(contents, { id })
}

/**
 * Writes an entry, minting an id when one is not supplied.
 *
 * Passing an existing id overwrites in place, which is how the issue link is written back after
 * filing.
 *
 * @returns The id used and the path written.
 */
export async function write(
  entry: Entry.serialize.Options,
  options: write.Options,
): Promise<write.ReturnType> {
  const id = options.id ?? Entry.newId()
  const file = toPath(id)
  await fs.mkdir(path.join(options.root, dir), { recursive: true })
  await fs.writeFile(path.join(options.root, file), Entry.serialize(entry), 'utf8')
  return { file, id }
}

export declare namespace write {
  /** Options for {@link write}. */
  type Options = {
    /** Reuse an existing id, overwriting that entry, instead of minting a new one. */
    id?: string | undefined
    /** Repository root. Entries live in `<root>/.agents/friction-log`. */
    root: string
  }
  /** Result of {@link write}. */
  type ReturnType = {
    /** Path relative to the repository root. */
    file: string
    /** Id used, whether supplied or minted. */
    id: string
  }
}

/**
 * Deletes an entry.
 *
 * @param id - Entry id, without the `.md` extension.
 * @returns `true` when a file was deleted, `false` when it was already gone. Being already gone is
 * not an error, so reconciliation stays safe to re-run.
 */
export async function remove(id: string, options: Options): Promise<boolean> {
  try {
    await fs.unlink(path.join(options.root, toPath(id)))
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw error
  }
}
