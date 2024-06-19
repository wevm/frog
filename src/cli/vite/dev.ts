import type { IncomingMessage, ServerResponse } from 'node:http'
import { getRequestListener } from '@hono/node-server'
import { ImageResponse } from 'hono-og'
import type { Connect, ViteDevServer, Plugin as VitePlugin } from 'vite'

export type DevServerOptions = {
  entry?: string
  export?: string
  injectClientScript?: boolean
  exclude?: RegExp[]
  ignoreWatching?: (string | RegExp)[]
  env?: Env | EnvFunc
  plugins?: Plugin[]
  adapter?: Adapter | Promise<Adapter> | (() => Adapter | Promise<Adapter>)
}

export const defaultOptions = {
  entry: './src/index.ts',
  // Note: we are not relying on the default export so we can be compatible with
  // runtimes that rely on it (e.g. Vercel Serverless Functions).
  export: 'app',
  injectClientScript: true,
  exclude: [
    /.*\.css$/,
    /.*\.ts$/,
    /.*\.tsx$/,
    /^\/@.+$/,
    /\?t\=\d+$/,
    /^\/favicon\.ico$/,
    /^\/static\/.+/,
    /^\/node_modules\/.*/,
    ///
    /.+\.(gif|jpe?g|tiff?|png|webp|bmp|woff|eot|woff2|ttf|otf|ico|txt)$/,
  ],
  ignoreWatching: [/\.wrangler/],
  plugins: [],
} satisfies Required<Omit<DevServerOptions, 'env' | 'adapter'>>

export function devServer(options?: DevServerOptions): VitePlugin {
  const entry = options?.entry ?? defaultOptions.entry

  async function createMiddleware(
    server: ViteDevServer,
  ): Promise<Connect.HandleFunction> {
    return async (
      req: IncomingMessage,
      res: ServerResponse,
      next: Connect.NextFunction,
    ) => {
      const exclude = options?.exclude ?? defaultOptions.exclude

      const devtoolsAssetsRegex = /assets\/.*(css|js|png|woff2)/
      for (const pattern of exclude) {
        if (!req.url) continue
        if (devtoolsAssetsRegex.test(req.url)) continue
        if (pattern.test(req.url)) return next()
      }

      let appModule: Record<string, unknown>
      try {
        appModule = await server.ssrLoadModule(entry)
      } catch (e) {
        return next(e)
      }

      const exportName = options?.export ?? defaultOptions.export
      const app = appModule[exportName] as { fetch: Fetch }

      if (!app)
        return next(
          new Error(
            `Failed to find a named export "${exportName}" from ${entry}`,
          ),
        )

      getRequestListener(
        async (request) => {
          let env: Env = {}

          if (options?.env) {
            if (typeof options.env === 'function')
              env = { ...env, ...(await options.env()) }
            else env = { ...env, ...options.env }
          }
          if (options?.plugins)
            for (const plugin of options.plugins) {
              if (plugin.env)
                env = {
                  ...env,
                  ...(typeof plugin.env === 'function'
                    ? await plugin.env()
                    : plugin.env),
                }
            }

          const adapter = await getAdapterFromOptions(options)

          if (adapter?.env) env = { ...env, ...adapter.env }

          const executionContext = adapter?.executionContext ?? {
            waitUntil: async (fn) => fn,
            passThroughOnException: () => {
              throw new Error('`passThroughOnException` is not supported')
            },
          }

          const response = await app.fetch(request, env, executionContext)

          /**
           * If the response is not instance of `Response` or `ImageResponse`, throw it so that it can be handled
           * by our custom errorHandler and passed through to Vite
           */
          if (
            !(response instanceof ImageResponse || response instanceof Response)
          )
            throw response

          if (
            options?.injectClientScript !== false &&
            response.headers.get('content-type')?.match(/^text\/html/)
          ) {
            const text = await response.clone().text()
            const isDevtools = text.includes('id="root"')
            const script = isDevtools
              ? '<script type="module">globalThis.__FROG_CLIENT_ENABLED__ = true</script>'
              : '<script>import("/@vite/client")</script>'
            const area = isDevtools ? 'head' : 'body'
            return injectStringToResponse(response, script, area)
          }
          return response
        },
        {
          errorHandler: (e) => {
            let err: Error
            if (e instanceof Error) {
              err = e
              server.ssrFixStacktrace(err)
            } else if (typeof e === 'string')
              err = new Error(
                `The response is not an instance of "Response", but: ${e}`,
              )
            else err = new Error(`Unknown error: ${e}`)

            next(err)
          },
        },
      )(req, res)
    }
  }

  return {
    name: 'frog:dev',
    configureServer: async (server) => {
      server.middlewares.use(await createMiddleware(server))
      server.httpServer?.on('close', async () => {
        if (options?.plugins)
          for (const plugin of options.plugins) {
            if (plugin.onServerClose) await plugin.onServerClose()
          }
        const adapter = await getAdapterFromOptions(options)
        if (adapter?.onServerClose) await adapter.onServerClose()
      })
    },
    config: () => {
      return {
        server: {
          watch: options?.injectClientScript
            ? {
                ignored:
                  options?.ignoreWatching ?? defaultOptions.ignoreWatching,
              }
            : null,
        },
      }
    },
  }
}

const getAdapterFromOptions = async (
  options: DevServerOptions | undefined,
): Promise<Adapter | undefined> => {
  let adapter = options?.adapter
  if (typeof adapter === 'function') adapter = adapter()
  if (adapter instanceof Promise) adapter = await adapter
  return adapter
}

function injectStringToResponse(
  response: Response,
  content: string,
  area: 'head' | 'body',
) {
  const stream = response.body
  const newContent = new TextEncoder().encode(content)

  if (!stream) return null

  const reader = stream.getReader()
  const newContentReader = new ReadableStream({
    start(controller) {
      controller.enqueue(newContent)
      controller.close()
    },
  }).getReader()

  const combinedStream = new ReadableStream({
    async start(controller) {
      for (;;) {
        const [existingResult, newContentResult] = await Promise.all(
          area === 'head'
            ? [newContentReader.read(), reader.read()]
            : [reader.read(), newContentReader.read()],
        )

        if (existingResult.done && newContentResult.done) {
          controller.close()
          break
        }

        if (!existingResult.done) controller.enqueue(existingResult.value)
        if (!newContentResult.done) controller.enqueue(newContentResult.value)
      }
    },
  })

  const headers = new Headers(response.headers)
  headers.delete('content-length')

  return new Response(combinedStream, {
    headers,
    status: response.status,
  })
}

type Env = Record<string, unknown> | Promise<Record<string, unknown>>
type EnvFunc = () => Env | Promise<Env>
interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void
  passThroughOnException(): void
}

type Fetch = (
  request: Request,
  env: {},
  executionContext: ExecutionContext,
) => Promise<Response>

interface Plugin {
  env?: Env | EnvFunc
  onServerClose?: () => void | Promise<void>
}

interface Adapter {
  /**
   * Environment variables to be injected into the worker
   */
  env?: Env
  /**
   * Function called when the vite dev server is closed
   */
  onServerClose?: () => Promise<void>
  /**
   * Implementation of waitUntil and passThroughOnException
   */
  executionContext?: {
    waitUntil(promise: Promise<unknown>): void
    passThroughOnException(): void
  }
}
