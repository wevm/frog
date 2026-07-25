import fs from 'node:fs/promises'
import path from 'node:path'
import * as Frictionset from './Frictionset.js'

/** Directory holding frictionset entries, relative to the repository root. */
export const dir = '.agents/frictionsets'

/** Files in `dir` that are documentation or config, never entries. */
const ignored = new Set(['AGENTS.md', 'CLAUDE.md', 'GEMINI.md', 'README.md', 'TEMPLATE.md'])

/** Options shared by every store operation. */
export type Options = {
  /** Repository root. Entries live in `<root>/.agents/frictionsets`. */
  root: string
}

/** Path of a frictionset file, relative to the repository root. */
export function toPath(id: string): string {
  return `${dir}/${id}.md`
}

/** Id of the frictionset a repository-relative path refers to, or `undefined` if it is not one. */
export function toId(file: string): string | undefined {
  const name = file.startsWith(`${dir}/`) ? file.slice(dir.length + 1) : undefined
  if (!name || name.includes('/') || !isEntry(name)) return undefined
  return name.slice(0, -3)
}

function isEntry(name: string): boolean {
  return name.endsWith('.md') && !name.startsWith('.') && !ignored.has(name)
}

/** Reads and parses every entry, sorted by id. Throws on the first malformed file. */
export async function read(options: Options): Promise<readonly Frictionset.Frictionset[]> {
  const ids = await list(options)
  return Promise.all(ids.map((id) => get(id, options)))
}

/** Ids of every entry, sorted. */
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

/** Reads and parses one entry. */
export async function get(id: string, options: Options): Promise<Frictionset.Frictionset> {
  const contents = await fs.readFile(path.join(options.root, toPath(id)), 'utf8')
  return Frictionset.parse(contents, { id })
}

/** Writes an entry, minting an id when one is not supplied. */
export async function write(
  frictionset: Frictionset.serialize.Options,
  options: write.Options,
): Promise<write.ReturnType> {
  const id = options.id ?? Frictionset.newId()
  const file = toPath(id)
  await fs.mkdir(path.join(options.root, dir), { recursive: true })
  await fs.writeFile(path.join(options.root, file), Frictionset.serialize(frictionset), 'utf8')
  return { file, id }
}

export declare namespace write {
  type Options = {
    /** Reuse an existing id instead of minting one. */
    id?: string | undefined
    /** Repository root. Entries live in `<root>/.agents/frictionsets`. */
    root: string
  }
  type ReturnType = {
    /** Path relative to the repository root. */
    file: string
    id: string
  }
}

/** Deletes an entry. Returns `false` when it was already gone. */
export async function remove(id: string, options: Options): Promise<boolean> {
  try {
    await fs.unlink(path.join(options.root, toPath(id)))
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw error
  }
}
