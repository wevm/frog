import { type Env, type Schema } from 'hono'

import { routes as devRoutes } from './dev/routes.js'
import {
  FarcBase,
  type FrameHandlerReturnType,
  type FrameOptions,
} from './farc-base.js'
import { type FrameContext } from './types.js'

/**
 * A Farc instance.
 *
 * @param parameters - {@link FarcConstructorParameters}
 * @returns instance. {@link FarcBase}
 *
 * @example
 * ```
 * import { Farc } from 'farc'
 *
 * const app = new Farc()
 *
 * app.frame('/', (context) => {
 *   const { buttonValue, inputText, status } = context
 *   const fruit = inputText || buttonValue
 *   return {
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
 *   }
 * })
 * ```
 */
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
