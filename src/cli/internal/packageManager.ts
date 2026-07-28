import fs from 'node:fs/promises'
import * as path from 'node:path'

type Environment = {
  /** Package-manager user agent. */
  npm_config_user_agent?: string | undefined
  /** Package-manager executable path. */
  npm_execpath?: string | undefined
}

type Manifest = {
  packageManager?: string | undefined
}

type Manager = 'bun' | 'npm' | 'pnpm' | 'yarn'

const commands = {
  bun: 'bunx frog',
  npm: 'npx frog',
  pnpm: 'pnpx frog',
  yarn: 'npx frog',
} as const satisfies Record<Manager, string>

const managers = {
  bun: 'bun',
  bunx: 'bun',
  npm: 'npm',
  'npm-cli': 'npm',
  pnpm: 'pnpm',
  'pnpm-cli': 'pnpm',
  yarn: 'yarn',
  yarnpkg: 'yarn',
} as const satisfies Record<string, Manager>

/** Returns the Frog command for the project package manager, falling back to the invoking manager. */
export async function resolve(options: resolve.Options = {}) {
  const manager = options.root
    ? await fs
        .readFile(path.join(options.root, 'package.json'), 'utf8')
        .then((contents) => fromIdentifier((JSON.parse(contents) as Manifest).packageManager))
        .catch(() => undefined)
    : undefined
  return commands[manager ?? fromEnvironment(options.env ?? process.env) ?? 'npm']
}

export declare namespace resolve {
  /** Options for selecting a project's Frog runner. */
  type Options = {
    /** Environment used when the project does not declare a package manager. */
    env?: Environment | undefined
    /** Repository root that may hold a `package.json`. */
    root?: string | undefined
  }
}

function fromEnvironment(env: Environment | undefined): Manager | undefined {
  const userAgent = env?.npm_config_user_agent?.trim().split(/\s+/, 1)[0]
  const executable = env?.npm_execpath ? path.basename(env.npm_execpath) : undefined
  return fromIdentifier(userAgent) ?? fromIdentifier(executable)
}

function fromIdentifier(value: string | undefined): Manager | undefined {
  if (!value) return undefined
  const name = value
    .split(/[/@]/, 1)[0]
    ?.replace(/\.(?:c|m)?js$/i, '')
    .toLowerCase()
  if (!name) return undefined
  return managers[name as keyof typeof managers]
}
