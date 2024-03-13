import { type Schema } from 'hono'
import { inspectRoutes } from 'hono/dev'

import type { FrogBase } from '../frog-base.js'
import type { Env } from '../types/env.js'
import { apiRoutes, type ApiRoutesOptions } from './api.js'
import type { Pretty } from '../types/utils.js'
import { clientRoutes } from './client.js'

export type DevtoolsOptions = Pretty<ApiRoutesOptions>

export function devtools<
  env extends Env,
  schema extends Schema,
  basePath extends string,
  //
  state = env['State'],
>(frog: FrogBase<env, schema, basePath, state>, options: DevtoolsOptions = {}) {
  const { appFid, appMnemonic } = options

  frog.hono
    .route(
      '/dev',
      clientRoutes({
        basePath: frog.basePath,
      }),
    )
    .route(
      '/dev/api',
      apiRoutes({
        appFid,
        appMnemonic,
        routes: inspectRoutes(frog.hono),
      }),
    )
}
