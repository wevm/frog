import { createReadStream, existsSync, lstatSync } from 'fs'
import type { ReadStream } from 'fs'
import { fileURLToPath } from 'node:url'
import { Hono } from 'hono'
import type { Context, MiddlewareHandler } from 'hono'
import { getFilePath } from 'hono/utils/filepath'
import { getMimeType } from 'hono/utils/mime'
import { resolve, dirname, relative } from 'path'
import { html } from 'hono/html'

export type ClientRouteOptions = {
  basePath: string
}

export function clientRoutes(options: ClientRouteOptions) {
  return new Hono()
    .get('/', async (c) => {
      return c.html(
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1.0"
            />
            <title>frog</title>

            <script type="module">
              {html`globalThis.__FROG_BASE_URL__ = '${c.req.url}'`}
            </script>

            <script type="module" src="./dev/index.js" />
            <link rel="stylesheet" href="./dev/assets/index.css" />
          </head>
          <body>
            <div id="root" />
          </body>
        </html>,
      )
    })
    .get(
      '/*',
      serveStatic({
        root: relative(
          './',
          resolve(dirname(fileURLToPath(import.meta.url)), './ui'),
        ),
        rewriteRequestPath(path) {
          const basePath = options.basePath === '/' ? '' : options.basePath
          const devBasePath = `${basePath}/dev`
          return path.replace(devBasePath, '')
        },
      }),
    )
}

export function serveStatic(
  options: {
    root?: string
    path?: string
    index?: string // default is 'index.html'
    rewriteRequestPath?: (path: string) => string
    onNotFound?: (path: string, c: Context) => void | Promise<void>
  } = { root: '' },
): MiddlewareHandler {
  return async (c, next) => {
    // Do nothing if Response is already set
    if (c.finalized) return next()

    const url = new URL(c.req.url)

    const filename = options.path ?? decodeURIComponent(url.pathname)
    let path = getFilePath({
      filename: options.rewriteRequestPath
        ? options.rewriteRequestPath(filename)
        : filename,
      root: options.root,
      defaultDocument: options.index ?? 'index.html',
    })

    if (!path) return next()

    path = `./${path}`

    if (!existsSync(path)) {
      await options.onNotFound?.(path, c)
      return next()
    }

    const mimeType = getMimeType(path)
    if (mimeType) c.header('Content-Type', mimeType)

    const stat = lstatSync(path)
    const size = stat.size

    if (c.req.method === 'HEAD' || c.req.method === 'OPTIONS') {
      c.header('Content-Length', size.toString())
      c.status(200)
      return c.body(null)
    }

    function createStreamBody(stream: ReadStream) {
      const body = new ReadableStream({
        start(controller) {
          stream.on('data', (chunk) => {
            controller.enqueue(chunk)
          })
          stream.on('end', () => {
            controller.close()
          })
        },

        cancel() {
          stream.destroy()
        },
      })
      return body
    }

    const range = c.req.header('range') || ''
    if (!range) {
      c.header('Content-Length', size.toString())
      return c.body(createStreamBody(createReadStream(path)), 200)
    }

    c.header('Accept-Ranges', 'bytes')
    c.header('Date', stat.birthtime.toUTCString())

    const parts = range.replace(/bytes=/, '').split('-', 2)
    const start = parts[0] ? parseInt(parts[0], 10) : 0
    let end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1
    if (size < end - start + 1) {
      end = size - 1
    }

    const chunksize = end - start + 1
    const stream = createReadStream(path, { start, end })

    c.header('Content-Length', chunksize.toString())
    c.header('Content-Range', `bytes ${start}-${end}/${stat.size}`)

    return c.body(createStreamBody(stream), 206)
  }
}
