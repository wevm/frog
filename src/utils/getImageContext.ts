import type { Context as Context_Hono, Input } from 'hono'
import type { Context, ImageContext } from '../types/context.js'
import type { Env } from '../types/env.js'

type GetImageContextParameters<
  env extends Env = Env,
  path extends string = string,
  input extends Input = {},
  //
  _state = env['State'],
> = {
  context: Omit<
    Context<env, path, input, _state>,
    'frameData' | 'verified' | 'status' | 'initialPath'
  >
  contextHono: Context_Hono<env, path, input>
  initialState?:
    | ((c: Context<env>) => _state | Promise<_state>)
    | _state
    | undefined
}

type GetImageContextReturnType<
  env extends Env = Env,
  path extends string = string,
  input extends Input = {},
  //
  _state = env['State'],
> = Promise<{
  context: ImageContext<env, path, input, _state>
}>

export async function getImageContext<
  env extends Env,
  path extends string,
  input extends Input = {},
  //
  _state = env['State'],
>(
  parameters: GetImageContextParameters<env, path, input, _state>,
): GetImageContextReturnType<env, path, input, _state> {
  const { context, contextHono } = parameters
  const { env, previousState, req } = context || {}

  return {
    context: {
      env,
      previousState: await (async () => {
        if (previousState) return previousState

        if (typeof parameters.initialState === 'function')
          return await (parameters.initialState as any)(contextHono)
        return parameters.initialState
      })(),
      req,
      res: (data) => ({ data, format: 'image', status: 'success' }),
      var: context.var,
    },
  }
}
