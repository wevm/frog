import type { Input } from 'hono'
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
  initialState?: _state
}

type GetImageContextReturnType<
  env extends Env = Env,
  path extends string = string,
  input extends Input = {},
  //
  _state = env['State'],
> = {
  context: ImageContext<env, path, input, _state>
}

export function getImageContext<
  env extends Env,
  path extends string,
  input extends Input = {},
  //
  _state = env['State'],
>(
  parameters: GetImageContextParameters<env, path, input, _state>,
): GetImageContextReturnType<env, path, input, _state> {
  const { context, initialState } = parameters
  const { env, previousState, req } = context || {}

  return {
    context: {
      env,
      previousState: previousState ?? (initialState as _state),
      req,
      res: (data) => ({ data, format: 'image', status: 'success' }),
      var: context.var,
    },
  }
}
