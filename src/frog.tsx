import type { Schema } from 'hono'

import { FrogBase, type FrogConstructorParameters } from './frog-base.js'
import type { Env } from './types/env.js'

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
 * const app = new Frog({ title: 'Frog Frame' })
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
  constructor(params: FrogConstructorParameters<env, basePath, _state>) {
    super(params as any)

    const frame = this.frame

    this.frame = (path: string, ...args: any[]) => {
      ;(frame as any)(path, ...args)
      return this
    }
  }
}
