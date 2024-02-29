import { spawn, execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import devServer from '@hono/vite-dev-server'
import pc from 'picocolors'
import { createLogger, createServer, loadEnv } from 'vite'

import { version } from '../../version.js'
import { findEntrypoint } from '../utils/findEntrypoint.js'

type DevOptions = {
  host?: boolean
  port?: number
  proxy?: 'cloudflared' | 'ngrok'
}

export async function dev(
  entry_: string | undefined,
  options: DevOptions = {},
) {
  const { host, port, proxy } = options
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

  const module = await server.ssrLoadModule(entry_resolved)
  const basePath = module.app?.basePath || '/'

  await server.listen()

  const logger = createLogger()
  logger.clearScreen('info')
  logger.info('')
  logger.info(
    `  ${pc.green('[running]')} ${pc.bold('frog')}@${pc.dim(`v${version}`)}`,
  )
  logger.info('')
  logger.info(
    `  ${pc.green('➜')}  ${pc.bold('Local')}:   ${pc.cyan(
      `http://localhost:${server.config.server.port}${basePath}`,
    )}`,
  )

  if (proxy) {
    const proxyLogPrefix = `  ${pc.green('➜')}  ${pc.bold('Proxy')}:   `
    switch (proxy) {
      case 'cloudflared': {
        try {
          const cloudflaredBin = execSync('which cloudflared', {
            encoding: 'utf8',
          }).trim()

          const child = spawn(cloudflaredBin, [
            'tunnel',
            '--url',
            `http://localhost:${server.config.server.port}`,
          ])

          // proxy url regex
          // https://regexr.com/7spe1
          const proxyUrlRegex = /https:\/\/.*.trycloudflare.com/

          // cloudflare diagnostic info logged to stderr
          child.stderr.on('data', (data) => {
            if (proxyUrlRegex.test(data)) {
              const match = data.toString().match(proxyUrlRegex)
              const proxyUrl = match?.[0]
              if (proxyUrl)
                logger.info(`${proxyLogPrefix}${pc.cyan(proxyUrl + basePath)}`)
            }
          })
        } catch (error) {
          // TODO: Error message
        }
        break
      }

      case 'ngrok': {
        try {
          const { forward } = await import('@ngrok/ngrok')
          const env = loadEnv('development', process.cwd(), '')
          const listener = await forward({
            // ngrok cli reads from this .env var by default so we should use it too
            // to keep things simple for now
            authtoken: env.NGROK_AUTHTOKEN,
            port: server.config.server.port,
          })
          const proxyUrl = listener.url()
          if (proxyUrl)
            logger.info(`${proxyLogPrefix}${pc.cyan(proxyUrl + basePath)}`)
        } catch (error) {
          // TODO: Error message
        }
      }
    }
  }
}
