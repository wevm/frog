import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import devServer from '@hono/vite-dev-server'
import pc from 'picocolors'
import { createLogger, createServer } from 'vite'
import { findEntrypoint } from '../utils/findEntrypoint.js'
import { version } from '../version.js'

type DevOptions = { host?: boolean; port?: number }

export async function dev(
  entry_: string | undefined,
  { host, port }: DevOptions = {},
) {
  const entry = entry_ || (await findEntrypoint())

  const entry_resolved = resolve(join(process.cwd(), entry))
  if (!existsSync(entry_resolved))
    throw new Error(`entrypoint not found: ${entry_resolved}`)

  const server = await createServer({
    root: process.cwd(),
    server: {
      host,
      port,
    },
    plugins: [
      devServer({
        entry: entry_resolved,
      }),
    ],
  })

  await server.listen()

  const logger = createLogger()
  logger.clearScreen('info')
  logger.info('')
  logger.info(
    `  ${pc.green('[running]')} ${pc.bold('farc')}@${pc.dim(`v${version}`)}`,
  )
  logger.info('')
  server.printUrls()
}
