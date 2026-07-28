import * as path from 'node:path'

type Environment = {
  /** Package-manager user agent. */
  npm_config_user_agent?: string | undefined
  /** Package-manager executable path. */
  npm_execpath?: string | undefined
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

/** Returns the Frog command for the invoking package manager. */
export function current(options: current.Options = {}) {
  return commands[fromEnvironment(options.env ?? process.env) ?? 'npm']
}

export declare namespace current {
  /** Options for selecting a package-manager runner. */
  type Options = {
    /** Environment used to identify the invoking package manager. */
    env?: Environment | undefined
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
    .split('/', 1)[0]
    ?.replace(/\.(?:c|m)?js$/i, '')
    .toLowerCase()
  if (!name) return undefined
  return managers[name as keyof typeof managers]
}
