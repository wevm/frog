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
  const value = `${env?.npm_config_user_agent ?? ''} ${env?.npm_execpath ?? ''}`
  if (value.includes('pnpm')) return 'pnpm'
  if (value.includes('bun')) return 'bun'
  if (value.includes('yarn')) return 'yarn'
  if (value.includes('npm')) return 'npm'
  return undefined
}
