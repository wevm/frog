import { type Env, type Schema } from 'hono'

import { routes as devRoutes } from './dev/routes.js'
import {
  FarcBase,
  type FrameHandlerReturnType,
  type FrameOptions,
} from './farc-base.js'
import { type FrameContext } from './types.js'

export class Farc<
  state = undefined,
  env extends Env = Env,
  schema extends Schema = {},
  basePath extends string = '/',
> extends FarcBase<state, env, schema, basePath> {
  override frame<path extends string>(
    path: path,
    handler: (
      context: FrameContext<path, state>,
    ) => FrameHandlerReturnType | Promise<FrameHandlerReturnType>,
    options: FrameOptions = {},
  ) {
    super.frame(path, handler, options)

    devRoutes(this, path)
  }
}
