import { Hono, type Schema } from 'hono'
import { inspectRoutes } from 'hono/dev'

import type { FrogBase } from '../../frog-base.js'
import type { Env } from '../../types/env.js'
import { apiRoutes } from '../api.js'
import type { DevtoolsOptions } from '../devtools.js'

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
    .get('/', (c) => {
      return c.html(
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1.0"
            />
            <title>frog</title>
          </head>
          <body>
            <div id="root" />
          </body>
        </html>,
      )
    })
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
