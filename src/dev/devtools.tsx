import type { serveStatic as n_serveStatic } from '@hono/node-server/serve-static'
import { Hono, type Schema } from 'hono'
import type { serveStatic as b_serveStatic } from 'hono/bun'
import type { serveStatic as c_serveStatic } from 'hono/cloudflare-workers'
import { getCookie } from 'hono/cookie'
import { inspectRoutes } from 'hono/dev'
import { html } from 'hono/html'
import { HTTPException } from 'hono/http-exception'

import type { FrogBase } from '../frog-base.js'
import type { Env } from '../types/env.js'
import type { Hub } from '../types/hub.js'
import type { Pretty } from '../types/utils.js'
import { getRequestUrl } from '../utils/getRequestUrl.js'
import {
  type ApiRoutesOptions,
  type Bootstrap,
  type RouteData,
  type User,
  apiRoutes,
  getFrameUrls,
  getInitialData,
} from './api.js'
import { uiDistDir } from './constants.js'
import { getUserDataByFid } from './utils/warpcast.js'

export type ServeStatic =
  | typeof n_serveStatic
  | typeof c_serveStatic
  | typeof b_serveStatic

export type DevtoolsOptions<serveStatic extends ServeStatic = ServeStatic> =
  RoutesOptions<serveStatic>

export function devtools<
  env extends Env,
  schema extends Schema,
  basePath extends string,
  serveStatic extends ServeStatic,
  ///
  state = env['State'],
>(
  frog: FrogBase<env, schema, basePath, state>,
  options?:
    | (DevtoolsOptions<serveStatic> & { root?: string | undefined })
    | undefined,
) {
  if (!(frog.dev?.enabled ?? true)) return

  const {
    appFid = frog.dev?.appFid,
    appMnemonic = frog.dev?.appMnemonic,
    assetsPath,
    basePath = '/dev',
    root,
    serveStatic,
    serveStaticOptions,
  } = options ?? {}

  let publicPath = ''
  if (assetsPath) publicPath = assetsPath === '/' ? '' : assetsPath
  else if (serveStatic) publicPath = `.${basePath}`
  else if (frog.assetsPath)
    publicPath = frog.assetsPath === '/' ? '' : frog.assetsPath
  else publicPath = `/${uiDistDir}`

  const rootBasePath = frog.basePath === '/' ? '' : frog.basePath
  const devBasePath = `${rootBasePath}${basePath}`

  const app = routes({
    appFid,
    appMnemonic,
    basePath: devBasePath,
    hub: frog.hub || (frog.hubApiUrl ? { apiUrl: frog.hubApiUrl } : undefined),
    publicPath,
    root,
    routes: inspectRoutes(frog.hono),
    secret: frog.secret,
    serveStatic,
    serveStaticOptions,
  })

  frog.hono.route(basePath, app)
  frog._dev = devBasePath
}

type RoutesOptions<serveStatic extends ServeStatic = ServeStatic> = Pretty<
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
    serveStatic?: serveStatic | ServeStatic | undefined
    /**
     * Parameters to pass to the {@link serveStatic} function.
     */
    serveStaticOptions?: Parameters<serveStatic>[0] | undefined
  }
>

export function routes(
  options: RoutesOptions & {
    basePath: string
    hub: Hub | undefined
    publicPath: string
    root: string | undefined
    routes: RouteData[]
    secret: string | undefined
  },
) {
  const {
    appFid,
    appMnemonic,
    basePath,
    hub,
    publicPath,
    root,
    routes,
    secret,
    serveStatic,
    serveStaticOptions,
  } = options

  const app = new Hono()
  const assetsPath = publicPath.endsWith('/')
    ? publicPath.replace(/\/$/, '')
    : publicPath

  app
    .get('/', async (c) => {
      const { origin } = getRequestUrl(c.req)
      const baseUrl = `${origin}${basePath}`

      let frameUrls: string[] = []
      let initialData: Bootstrap['data'] = undefined
      const url = c.req.query('url')
      if (url || routes.length) {
        frameUrls = getFrameUrls(origin, routes)

        let frameUrl = frameUrls[0]
        if (url) {
          const tmpUrl = `${origin}${url}`
          if (url.startsWith('/')) frameUrl = tmpUrl
          else frameUrl = url
        }

        try {
          if (frameUrl)
            initialData = (await getInitialData(frameUrl)) as Bootstrap['data']
        } catch (error) {
          if (error instanceof HTTPException) throw error
        }
      }

      let user: User | undefined = undefined
      const cookie = getCookie(c, 'frog_user') ?? getCookie(c, 'user')
      if (cookie)
        try {
          const parsed = JSON.parse(cookie)
          if (parsed && hub) {
            const data = await getUserDataByFid(hub, parsed.userFid)
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
        : 'Frog Devtools'

      return c.html(
        <>
          {html`<!doctype html>`}
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
                src={`${assetsPath}/main.js`}
              />
              <link
                rel="stylesheet"
                crossorigin=""
                href={`${assetsPath}/assets/main.css`}
              />

              <link
                rel="alternate icon"
                type="image/png"
                href={`${assetsPath}/assets/icon.png`}
              />

              {/* Prevent background flash */}
              <style id="__SSR_STYLE__">
                {html`
                  @media (prefers-color-scheme: dark) {
                    html {
                      background-color: #000;
                    }
                  }
                `}
              </style>
            </head>
            <body>
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
        hub,
        routes,
        secret,
      }),
    )

  if (serveStatic)
    app.get(
      '/*',
      serveStatic({
        manifest: '',
        rewriteRequestPath(path) {
          return path.replace(basePath, uiDistDir)
        },
        root,
        ...serveStaticOptions,
      }),
    )

  return app
}
