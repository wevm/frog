import type { Context as Context_hono, Input } from 'hono'
import type { ImageContext } from '../types/context.js'
import type { Env } from '../types/env.js'

type GetImageContextParameters<
  env extends Env = Env,
  path extends string = string,
  input extends Input = {},
  //
  _state = env['State'],
> = {
  context: Context_hono<env, path, input>
}

type GetImageContextReturnType<
  env extends Env = Env,
  path extends string = string,
  input extends Input = {},
  //
  _state = env['State'],
> = {
  context: ImageContext<env, path, input>
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
  const { context } = parameters
  const { env, req } = context || {}

  return {
    context: {
      env,
      req,
      res: (data) => ({ data, format: 'image', status: 'success' }),
      var: context.var,
    },
  }
}
