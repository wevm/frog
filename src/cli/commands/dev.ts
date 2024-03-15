import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import pc from 'picocolors'
import { createLogger, createServer } from 'vite'

import type { Frog } from '../../frog.js'
import { version } from '../../version.js'
import { findEntrypoint } from '../utils/findEntrypoint.js'
import { defaultOptions, devServer } from '../vite/dev.js'

type DevOptions = {
  host?: boolean
  port?: number
  staticDir?: string
}

export async function dev(
  entry_: string | undefined,
  options: DevOptions = {},
) {
  const { host, port, staticDir } = options
  const entry = entry_ || (await findEntrypoint())

  const entry_resolved = resolve(join(process.cwd(), entry))
  if (!existsSync(entry_resolved))
    throw new Error(`entrypoint not found: ${entry_resolved}`)

  const server = await createServer({
    plugins: [
      devServer({
        entry: entry_resolved,
        exclude: [
          ...defaultOptions.exclude,
          /.+\.(gif|jpe?g|tiff?|png|webp|bmp|woff|eot|woff2|ttf|otf|ico|txt)$/,
        ],
        // Note: we are not relying on the default export so we can be compatible with
        // runtimes that rely on it (e.g. Vercel Serverless Functions).
        export: 'app',
      }),
    ],
    publicDir: staticDir ?? 'public',
    root: process.cwd(),
    server: {
      host,
      port,
    },
  })

  const module = await server.ssrLoadModule(entry_resolved)
  const app = module.app as Frog | undefined
  const basePath = app?.basePath || '/'

  await server.listen()
  server.bindCLIShortcuts()
  const url = `http://localhost:${server.config.server.port}`

  const logger = createLogger()
  logger.clearScreen('info')
  logger.info('')
  logger.info(
    `  ${pc.green('[running]')} ${pc.bold('frog')}@${pc.dim(`v${version}`)}`,
  )
  logger.info('')
  const appUrl = `${url}${basePath}`
  logger.info(`  ${pc.green('➜')}  ${pc.bold('Local')}:   ${pc.cyan(appUrl)}`)

  if (app?.dev) {
    const devUrl = `${url}${app.dev}`
    logger.info(`  ${pc.green('➜')}  ${pc.bold('Inspect')}: ${pc.cyan(devUrl)}`)
  }
}
