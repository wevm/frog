import { Hono, type Schema } from 'hono'
import { inspectRoutes } from 'hono/dev'
import type { serveStatic as n_serveStatic } from '@hono/node-server/serve-static'
import type { serveStatic as c_serveStatic } from 'hono/cloudflare-workers'
import type { serveStatic as b_serveStatic } from 'hono/bun'
import { dirname, relative, resolve } from 'path'
import { fileURLToPath } from 'url'
import { html } from 'hono/html'

import type { FrogBase } from '../frog-base.js'
import type { Env } from '../types/env.js'
import {
  apiRoutes,
  getInitialData,
  type ApiRoutesOptions,
  getFrameUrls,
  type User,
  type Bootstrap,
} from './api.js'
import type { Pretty } from '../types/utils.js'
import { getCookie } from 'hono/cookie'
import { getUserDataByFid } from './utils/warpcast.js'

export type DevtoolsOptions = Pretty<
  Pretty<ApiRoutesOptions> & {
    assetsPath?: string
    /**
     * The base path for the devtools instance off the Frog instances `basePath`.
     *
     * @default '/dev'
     */
    basePath?: string | undefined
    serveStatic?: ServeStatic | undefined
    serveStaticOptions?:
      | Pretty<
          Omit<
            Pretty<NonNullable<Parameters<typeof c_serveStatic>[0]>>,
            'rewriteRequestPath' | 'root'
          >
        >
      | undefined
  }
>

type ServeStatic =
  | typeof n_serveStatic
  | typeof c_serveStatic
  | typeof b_serveStatic

export function devtools<
  env extends Env,
  schema extends Schema,
  basePath extends string,
  ///
  state = env['State'],
>(frog: FrogBase<env, schema, basePath, state>, options?: DevtoolsOptions) {
  const {
    appFid,
    appMnemonic,
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
  else publicPath = frog.assetsPath === '/' ? '' : frog.assetsPath

  const rootBasePath = frog.basePath === '/' ? '' : frog.basePath
  const devBasePath = `${rootBasePath}${basePath}`

  const app = new Hono()
  app
    .get('/', async (c) => {
      const url = new URL(c.req.url)

      let frameUrls: string[] = []
      let initialData: Bootstrap['data'] = undefined
      if (routes.length) {
        frameUrls = getFrameUrls(url.origin, routes)
        initialData = (await getInitialData(frameUrls[0])) as Bootstrap['data']
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
              <title>frog</title>

              <script type="module">
                {html`globalThis.__FROG_BASE_URL__ = '${c.req.url}'`}
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
            <body>
              <div id="root" />
              <script
                id="__FROG_DATA__"
                type="application/json"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
                dangerouslySetInnerHTML={{
                  __html: bootstrap,
                }}
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
        ...serveStaticOptions,
        root: relative(
          './',
          resolve(dirname(fileURLToPath(import.meta.url)), '../ui'),
        ),
        rewriteRequestPath(path) {
          return path.replace(devBasePath, '')
        },
      }),
    )

  frog.hono.route(basePath, app)
  frog.dev = devBasePath
}
