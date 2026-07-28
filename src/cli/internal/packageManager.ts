import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

export type Command = {
  args: readonly string[]
  executable: 'bun' | 'npm' | 'pnpm' | 'yarn'
}

type Manager = 'bun' | 'npm' | 'pnpm' | 'yarnClassic' | 'yarnModern'

const commands = {
  bun: { args: ['add', '--global', 'frog'], executable: 'bun' },
  npm: { args: ['install', '--global', 'frog'], executable: 'npm' },
  pnpm: { args: ['add', '--global', 'frog'], executable: 'pnpm' },
  yarnClassic: { args: ['global', 'add', 'frog'], executable: 'yarn' },
  // Yarn Modern removed global installs. `npx frog init` guarantees npm is available as a fallback.
  yarnModern: { args: ['install', '--global', 'frog'], executable: 'npm' },
} as const satisfies Record<Manager, Command>

/** Formats a package-manager command for display. */
export function format(command: Command): string {
  return [command.executable, ...command.args].join(' ')
}

/** Installs Frog globally with the resolved package manager. */
export async function install(command: Command, options: install.Options): Promise<void> {
  const env = { ...process.env }
  for (const [name, value] of Object.entries(options.env ?? {}))
    if (value !== undefined) env[name] = value
  // Windows package-manager shims are `.cmd` files, so invoke cmd.exe without deprecated shell
  // argument concatenation.
  const executable =
    process.platform === 'win32' ? (env['ComSpec'] ?? 'cmd.exe') : command.executable
  const args =
    process.platform === 'win32' ? ['/d', '/s', '/c', format(command)] : [...command.args]

  await new Promise<void>((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: options.cwd,
      env,
      stdio: 'ignore',
      windowsHide: true,
    })

    child.once('error', () => reject(new InstallError(command, 'could not be started')))
    child.once('close', (code, signal) => {
      if (code === 0) return resolve()
      const detail = signal
        ? `was terminated by ${signal}`
        : `exited with code ${code ?? 'unknown'}`
      reject(new InstallError(command, detail))
    })
  })
}

export declare namespace install {
  type Options = {
    cwd: string
    env?: Record<string, string | undefined> | undefined
  }
}

/** Resolves the global-install command from repository metadata and the invoking package manager. */
export async function resolve(options: resolve.Options): Promise<Command> {
  const declared = await fromManifest(options.root)
  if (declared) return commands[declared]

  const marked = await fromMarkers(options.root)
  if (marked) return commands[marked]

  return commands[fromUserAgent(options.env?.npm_config_user_agent) ?? 'npm']
}

export declare namespace resolve {
  type Options = {
    env?: {
      npm_config_user_agent?: string | undefined
    }
    root: string
  }
}

async function exists(file: string): Promise<boolean> {
  return fs.stat(file).then(
    () => true,
    () => false,
  )
}

async function fromManifest(root: string): Promise<Manager | undefined> {
  const value = await fs
    .readFile(path.join(root, 'package.json'), 'utf8')
    .then((contents) => (JSON.parse(contents) as { packageManager?: unknown }).packageManager)
    .catch(() => undefined)
  if (typeof value !== 'string') return undefined

  const match = /^(bun|npm|pnpm|yarn)@([^+]+)/.exec(value)
  if (!match) return undefined
  const [, name, version] = match
  if (name !== 'yarn') return name as Exclude<Manager, 'yarnClassic' | 'yarnModern'>
  return version?.startsWith('1.') ? 'yarnClassic' : 'yarnModern'
}

async function fromMarkers(root: string): Promise<Manager | undefined> {
  const markers = {
    bun: ['bun.lock', 'bun.lockb'],
    npm: ['package-lock.json', 'npm-shrinkwrap.json'],
    pnpm: ['pnpm-lock.yaml', 'pnpm-workspace.yaml'],
    yarn: ['yarn.lock', '.yarnrc.yml'],
  } as const
  const found = (
    await Promise.all(
      Object.entries(markers).map(async ([manager, files]) => ({
        found: (await Promise.all(files.map((file) => exists(path.join(root, file))))).some(
          Boolean,
        ),
        manager,
      })),
    )
  ).filter((entry) => entry.found)

  if (found.length !== 1) return undefined
  const manager = found[0]?.manager
  if (manager !== 'yarn') return manager as Exclude<Manager, 'yarnClassic' | 'yarnModern'>
  if (await exists(path.join(root, '.yarnrc.yml'))) return 'yarnModern'

  const lock = await fs.readFile(path.join(root, 'yarn.lock'), 'utf8').catch(() => '')
  if (lock.includes('# yarn lockfile v1')) return 'yarnClassic'
  return 'yarnModern'
}

function fromUserAgent(value: string | undefined): Manager | undefined {
  const match = /^(bun|npm|pnpm|yarn)\/([^\s]+)/.exec(value ?? '')
  if (!match) return undefined
  const [, name, version] = match
  if (name !== 'yarn') return name as Exclude<Manager, 'yarnClassic' | 'yarnModern'>
  return version?.startsWith('1.') ? 'yarnClassic' : 'yarnModern'
}

class InstallError extends Error {
  readonly code = 'INSTALL_FAILED'

  constructor(command: Command, detail: string) {
    super(
      `Failed to install Frog globally: \`${format(command)}\` ${detail}. ` +
        'Run the command directly for details, or rerun `npx frog init --no-global` to skip installation.',
    )
    this.name = 'PackageManager.InstallError'
  }
}
