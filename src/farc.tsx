import type { Env, Schema } from 'hono'
import { routes as devRoutes } from './dev/routes.js'
import { FarcBase, type FrameHandlerReturnType } from './farc-base.js'
import type { FrameContext, PreviousFrameContext } from './types.js'

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
      previousContext: PreviousFrameContext<path, state> | undefined,
    ) => FrameHandlerReturnType | Promise<FrameHandlerReturnType>,
  ) {
    super.frame(path, handler)

    devRoutes(this, path)
  }
}
