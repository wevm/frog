import { type Env, type Schema } from 'hono'

import { routes as devRoutes } from './dev/routes.js'
import { type FrameOptions, FrogBase } from './frog-base.js'
import { type FrameContext, type FrameResponse } from './types/frame.js'
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
  state = undefined,
  env extends Env = Env,
  schema extends Schema = {},
  basePath extends string = '/',
> extends FrogBase<state, env, schema, basePath> {
  override frame<path extends string>(
    path: path,
    handler: (
      context: Pretty<FrameContext<path, state>>,
    ) => FrameResponse | Promise<FrameResponse>,
    options: FrameOptions = {},
  ) {
    super.frame(path, handler, options)

    if (this.dev?.enabled ?? true) devRoutes(this, path)
  }
}
