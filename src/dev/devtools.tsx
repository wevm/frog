import type { serveStatic as n_serveStatic } from '@hono/node-server/serve-static'
import { Hono, type Schema } from 'hono'
import type { serveStatic as b_serveStatic } from 'hono/bun'
import type { serveStatic as c_serveStatic } from 'hono/cloudflare-workers'
import { inspectRoutes } from 'hono/dev'
import { html } from 'hono/html'

import { getCookie } from 'hono/cookie'
import type { FrogBase } from '../frog-base.js'
import type { Env } from '../types/env.js'
import type { Pretty } from '../types/utils.js'
import {
  type ApiRoutesOptions,
  type Bootstrap,
  type User,
  apiRoutes,
  getFrameUrls,
  getInitialData,
} from './api.js'
import { isCloudflareWorkers } from './utils/env.js'
import { getUserDataByFid } from './utils/warpcast.js'

export type DevtoolsOptions<serveStatic extends ServeStatic = ServeStatic> =
  Pretty<
    Pretty<ApiRoutesOptions> & {
      /**
       * The base path for devtools assets.
       */
      assetsPath?: string
      /**
       * The base path for the devtools instance off the Frog instances `basePath`.
       *
       * @default '/dev'
       */
      basePath?: string | undefined
      /**
       * Platform-dependent function to serve devtools' static files.
       *
       * @example
       * import { serveStatic } from 'frog/serve-static'
       * import { serveStatic } from 'hono/bun'
       * import { serveStatic } from 'hono/cloudflare-workers'
       * import { serveStatic } from '@hono/node-server/serve-static'
       */
      serveStatic?: ServeStatic | undefined
      /**
       * Parameters to pass to the {@link serveStatic} function.
       */
      serveStaticOptions?:
        | Pretty<NonNullable<Parameters<serveStatic>[0]>>
        | undefined
    }
  >

type ServeStatic =
  | typeof n_serveStatic
  | typeof c_serveStatic
  | typeof b_serveStatic

let root: string | undefined
if (!isCloudflareWorkers()) {
  const { dirname, relative, resolve } = await import('node:path')
  const { fileURLToPath } = await import('node:url')
  root = relative(
    './',
    resolve(dirname(fileURLToPath(import.meta.url)), '../ui'),
  )
}

const uiDistDir = '.frog'

/**
 * Built-in devtools with live preview, hot reload, time-travel debugging, and more.
 *
 * @see https://frog.fm/dev/devtools
 */
export function devtools<
  env extends Env,
  schema extends Schema,
  basePath extends string,
  serveStatic extends ServeStatic,
  ///
  state = env['State'],
>(
  frog: FrogBase<env, schema, basePath, state>,
  options?: DevtoolsOptions<serveStatic>,
) {
  if (!(frog.dev?.enabled ?? true)) return

  const {
    appFid = frog.dev?.appFid,
    appMnemonic = frog.dev?.appMnemonic,
    assetsPath,
    basePath = '/dev',
    serveStatic,
    serveStaticOptions = { manifest: '' },
  } = options ?? {}

  const routes = inspectRoutes(frog.hono)
  const hubApiUrl = frog.hub?.apiUrl || frog.hubApiUrl

  let publicPath = ''
  if (assetsPath) publicPath = assetsPath === '/' ? '' : assetsPath
  else if (serveStatic) publicPath = `.${basePath}`
  else if (frog.assetsPath)
    publicPath = frog.assetsPath === '/' ? '' : frog.assetsPath
  else publicPath = `/${uiDistDir}`

  const rootBasePath = frog.basePath === '/' ? '' : frog.basePath
  const devBasePath = `${rootBasePath}${basePath}`

  const app = new Hono()
  app
    .get('/', async (c) => {
      const { origin } = new URL(c.req.url)
      const baseUrl = `${origin}${devBasePath}`

      let frameUrls: string[] = []
      let initialData: Bootstrap['data'] = undefined
      if (routes.length) {
        frameUrls = getFrameUrls(origin, routes)

        let frameUrl = frameUrls[0]
        const url = c.req.query('url')
        if (url) {
          const tmpUrl = `${origin}${url}`
          if (url.startsWith('/')) frameUrl = tmpUrl
          else if (frameUrls.includes(url)) frameUrl = url
        }

        initialData = (await getInitialData(frameUrl)) as Bootstrap['data']
      }

      let user: User | undefined = undefined
      const cookie = getCookie(c, 'user')
      if (cookie)
        try {
          const parsed = JSON.parse(cookie)
          if (parsed && hubApiUrl) {
            const data = await getUserDataByFid(hubApiUrl, parsed.userFid)
            user = { state: 'completed', ...parsed, ...data }
          }
        } catch {}

      const bootstrap = JSON.stringify({
        data: initialData,
        frameUrls,
        user,
      } satisfies Bootstrap)

      const title = initialData
        ? `frame: ${new URL(initialData.url).pathname}`
        : 'frog'

      return c.html(
        <>
          {html`<!DOCTYPE html>`}
          <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta
                name="viewport"
                content="width=device-width, initial-scale=1.0"
              />
              <title>{title}</title>

              <script type="module">
                {html`globalThis.__FROG_BASE_URL__ = '${baseUrl}'`}
              </script>

              <script
                type="module"
                crossorigin=""
                src={`${publicPath}/main.js`}
              />
              <link
                rel="stylesheet"
                crossorigin=""
                href={`${publicPath}/assets/main.css`}
              />

              <link
                rel="alternate icon"
                type="image/png"
                href={`${publicPath}/assets/icon.png`}
              />
            </head>
            <body style={{ backgroundColor: '#000' }}>
              <div id="root" />
              <script
                id="__FROG_DATA__"
                type="application/json"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
                dangerouslySetInnerHTML={{ __html: bootstrap }}
              />
            </body>
          </html>
        </>,
      )
    })
    .route(
      '/api',
      apiRoutes({
        appFid,
        appMnemonic,
        hubApiUrl,
        routes,
        secret: frog.secret,
      }),
    )

  if (serveStatic)
    app.get(
      '/*',
      serveStatic({
        manifest: '',
        rewriteRequestPath(path) {
          return path.replace(devBasePath, uiDistDir)
        },
        root,
        ...serveStaticOptions,
      }),
    )

  frog.hono.route(basePath, app)
  frog._dev = devBasePath
}
