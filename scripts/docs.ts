import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const root = path.join(import.meta.dirname, '..')

/**
 * Modules re-exported from `src/index.ts`, which is the whole public surface.
 *
 * Read from the entrypoint rather than listed here, so adding a public module cannot quietly escape
 * the check.
 *
 * Checked against emitted declarations rather than source: `.d.ts` preserves TSDoc, drops
 * implementation noise, and is machine-formatted, so a line scan is reliable. The workspace
 * TypeScript is the native port, which exposes no JavaScript compiler API to walk an AST with.
 */
const entrypoint = await fs.readFile(path.join(root, 'src/index.ts'), 'utf8')
const modules = [...entrypoint.matchAll(/export \* as \w+ from '\.\/([\w.]+)\.js'/g)].map(
  (match) => match[1] ?? '',
)

if (modules.length === 0) throw new Error('No public modules found in src/index.ts')

/** A top-level exported declaration. */
const declaration =
  /^export (?:declare )?(?:abstract )?(const|function|class|type|namespace|enum) ([\w$]+)/

/** A type alias nested inside a namespace, such as `parse.Options`. */
const nested = /^\s+type ([\w$]+)/

/**
 * A property of a type literal or a class member.
 *
 * Terminated with `;`, which separates a real member from a wrapped parameter in a long signature
 * (those end with `,` or `)`).
 */
const member = /^\s+(?:readonly )?([\w$]+)\??:.*;$/

/** Documented when the nearest preceding non-blank line closes a comment block. */
function documented(lines: readonly string[], index: number): boolean {
  for (let cursor = index - 1; cursor >= 0; cursor--) {
    const line = lines[cursor]?.trim()
    if (!line) continue
    return line.endsWith('*/')
  }
  return false
}

const out = await fs.mkdtemp(path.join(os.tmpdir(), 'frog-docs-'))
await exec(
  'pnpm',
  ['exec', 'tsc', '--noEmit', 'false', '--emitDeclarationOnly', '--declaration', '--outDir', out],
  { cwd: root },
)

type Finding = { line: number; module: string; name: string }

const findings: Finding[] = []
for (const module of modules) {
  const contents = await fs.readFile(path.join(out, 'src', `${module}.d.ts`), 'utf8')
  const lines = contents.split('\n')

  // Only descend into declarations whose braces hold documentable members. A `const` or `function`
  // can also open a brace, but those are generic type arguments (`z.ZodObject<{ ... }>`) or inline
  // return types, not public properties.
  let depth = 0
  let documentable = false

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    const skip = !trimmed || trimmed.startsWith('*') || trimmed.startsWith('/*')

    if (!skip && !trimmed.startsWith('import ') && !trimmed.startsWith('//')) {
      const top = depth === 0 ? declaration.exec(line) : undefined
      if (top) {
        const [, kind = '', name = ''] = top
        documentable = kind === 'class' || kind === 'namespace' || kind === 'type'
        // A namespace only groups a documented function's types; its members carry the docs.
        if (kind !== 'namespace' && !documented(lines, index))
          findings.push({ line: index + 1, module, name })
      } else if (documentable && depth > 0) {
        const inner = nested.exec(line) ?? member.exec(line)
        const name = inner?.[1]
        if (name && !documented(lines, index)) findings.push({ line: index + 1, module, name })
      }
    }

    if (!skip) depth += count(line, '{') - count(line, '}')
  })
}

function count(line: string, character: string): number {
  return line.split(character).length - 1
}

await fs.rm(out, { force: true, recursive: true })

if (findings.length === 0) {
  console.log(
    `pass: every public export and type property in ${modules.length} modules is documented`,
  )
  process.exit(0)
}

console.error(`fail: ${findings.length} undocumented public declarations\n`)
for (const finding of findings)
  console.error(`  ${finding.module}.d.ts:${finding.line}  ${finding.name}`)
process.exit(1)
