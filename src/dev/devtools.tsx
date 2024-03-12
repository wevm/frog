import { Hono, type Schema } from 'hono'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, relative } from 'pathe'
import { inspectRoutes } from 'hono/dev'

import type { FrogBase } from '../frog-base.js'
import type { Env } from '../types/env.js'
import { apiRoutes, type ApiRoutesOptions } from './api.js'
import { serveStatic } from './vendor/hono-node-server.js'
import type { Pretty } from '../types/utils.js'

export type DevtoolsOptions = Pretty<ApiRoutesOptions>

export function devtools<
  env extends Env,
  schema extends Schema,
  basePath extends string,
  //
  state = env['State'],
>(frog: FrogBase<env, schema, basePath, state>, options: DevtoolsOptions = {}) {
  const { appFid, appMnemonic } = options
  const app = new Hono()

  app
    .get('/', async (c) => {
      return c.html(
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1.0"
            />
            <title>frame: /</title>

            <script type="module" crossorigin="" src="./dev/index.js" />
            <link
              rel="stylesheet"
              crossorigin=""
              href="./dev/assets/index.css"
            />

            {/* TODO: Disable if not `frog dev` */}
            <script type="module" crossorigin="" src="./dev/frog-client.js" />
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
          const basePath = frog.basePath === '/' ? '' : frog.basePath
          const devBasePath = `${basePath}/dev`
          console.log({ basePath, devBasePath, path })
          return path.replace(devBasePath, '')
        },
      }),
    )
    .route(
      '/api',
      apiRoutes({
        appFid,
        appMnemonic,
        routes: inspectRoutes(frog.hono),
      }),
    )

  frog.hono.route('/dev', app)
}
