import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
// TODO: replace w/ @hono/vite-dev-server once https://github.com/honojs/vite-plugins/pull/86 merged.
import devServer from '@wevm/hono-vite-dev-server'
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
        // Note: we are not relying on the default export so we can be compatible with
        // runtimes that rely on it (ie. Vercel Serverless Functions).
        export: 'app',
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
