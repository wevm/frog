import { type Schema } from 'hono'

import { routes as devRoutes } from './dev/routes.js'
import { FrogBase, type RouteOptions } from './frog-base.js'
import { type FrameContext } from './types/context.js'
import type { Env } from './types/env.js'
import { type FrameResponse } from './types/frame.js'
import type { HandlerResponse } from './types/response.js'
import { type Pretty } from './types/utils.js'

/**
 * A Frog instance.
 *
 * @param parameters - {@link FrogConstructorParameters}
 * @returns instance. {@link FrogBase}
 *
 * @example
 * ```
 * import { Frog } from 'frog'
 *
 * const app = new Frog()
 *
 * app.frame('/', (c) => {
 *   const { buttonValue, inputText, status } = c
 *   const fruit = inputText || buttonValue
 *   return c.res({
 *     image: (
 *       <div style={{ fontSize: 60 }}>
 *         {fruit ? `You selected: ${fruit}` : 'Welcome!'}
 *       </div>
 *     ),
 *     intents: [
 *       <Button value="apples">Apples</Button>,
 *       <Button value="oranges">Oranges</Button>,
 *       <Button value="bananas">Bananas</Button>,
 *     ]
 *   })
 * })
 * ```
 */
export class Frog<
  env extends Env = Env,
  schema extends Schema = {},
  basePath extends string = '/',
  //
  _state = env['State'],
> extends FrogBase<env, schema, basePath, _state> {
  override frame<path extends string>(
    path: path,
    handler: (
      context: Pretty<FrameContext<env, path, _state>>,
    ) => HandlerResponse<FrameResponse>,
    options: RouteOptions = {},
  ) {
    super.frame(path, handler as any, options)

    if (this.dev?.enabled ?? true) devRoutes(this, path)
  }
}
