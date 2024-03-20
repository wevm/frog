import { existsSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Hono } from 'hono'
import pc from 'picocolors'
import { createLogger, createServer } from 'vite'

import type { Frog } from '../../frog.js'
import { version } from '../../version.js'
import { findEntrypoint } from '../utils/findEntrypoint.js'
import { type ServerUrls, printServerUrls } from '../utils/logger.js'
import { devServer } from '../vite/dev.js'

type DevOptions = {
  host?: boolean | undefined
  port?: number | undefined
  staticDir?: string | undefined
  ui?: boolean | undefined
}

export async function dev(path: string | undefined, options: DevOptions = {}) {
  const { host, port, staticDir, ui } = options

  const entryPath = path || (await findEntrypoint())
  let entry = entryPath ? resolve(join(process.cwd(), entryPath)) : undefined
  const entryExists = entry ? existsSync(entry) : false

  let injectClientScript = true
  if (!entryExists || ui) {
    function getApp(filename: string) {
      const path = relative(
        './',
        resolve(dirname(fileURLToPath(import.meta.url)), filename),
      )
      if (existsSync(path)) return path
      return undefined
    }
    const appEntry = getApp('../app.js') ?? getApp('../app.ts')
    entry = appEntry
    injectClientScript = false
  }

  if (!entry) throw new Error('Error loading entry.')

  const server = await createServer({
    plugins: [
      devServer({
        entry,
        injectClientScript,
      }),
    ],
    publicDir: staticDir ?? 'public',
    root: process.cwd(),
    server: {
      host,
      port,
    },
  })

  const module = (await server.ssrLoadModule(entry)) as {
    app: Frog | Hono | undefined
  }
  const app = module.app
  if (!app) {
    await server.close()
    throw new Error(`app export not found: ${entry}`)
  }

  await server.listen()
  server.bindCLIShortcuts()

  const logger = createLogger()
  logger.clearScreen('info')
  logger.info('')
  logger.info(
    `  ${pc.green('[running]')} ${pc.bold('frog')}@${pc.dim(`v${version}`)}`,
  )
  logger.info('')

  if (path !== undefined && !entryExists) {
    logger.info(
      pc.yellow(
        `  Using standalone devtools. No entry found at ${pc.bold(entryPath)}.`,
      ),
    )
    logger.info('')
  }

  let devBasePath: string | false | undefined = false
  let resolvedUrls: ServerUrls = {
    local: server.resolvedUrls?.local ?? [],
    network: server.resolvedUrls?.network ?? [],
    dev: [],
  }
  if ('version' in app && app.version === version) {
    const leadingSlashRegex = /^\//
    const basePath =
      app.basePath === '/' ? '' : app.basePath.replace(leadingSlashRegex, '')
    devBasePath = app._dev ? app._dev.replace(leadingSlashRegex, '') : undefined
    resolvedUrls = {
      local: (server.resolvedUrls?.local ?? []).map(
        (url) => `${url}${basePath}`,
      ),
      network: (server.resolvedUrls?.network ?? []).map(
        (url) => `${url}${basePath}`,
      ),
      dev: devBasePath
        ? (server.resolvedUrls?.local ?? []).map(
            (url) => `${url}${devBasePath}`,
          )
        : [],
    }
  }

  printServerUrls(
    resolvedUrls,
    {
      dev: devBasePath,
      host: server.config.server.host,
    },
    logger.info,
  )
}
