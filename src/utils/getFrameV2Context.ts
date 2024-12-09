import type { Context as Context_Hono, Input } from 'hono'
import type { FrameV2Context } from '../types/context.js'
import type { Env } from '../types/env.js'

type GetFrameV2ContextParameters<
  env extends Env = Env,
  path extends string = string,
  input extends Input = {},
  state = env['State'],
> = {
  context: Pick<
    FrameV2Context<env, path, input, state>,
    'env' | 'previousState' | 'previousButtonValues' | 'req' | 'var'
  >
  contextHono: Context_Hono<env, path, input>
  initialState?:
    | ((c: FrameV2Context<env>) => state | Promise<state>)
    | state
    | undefined
}

type GetFrameV2ContextReturnType<
  env extends Env = Env,
  path extends string = string,
  input extends Input = {},
  state = env['State'],
> = Promise<{
  context: FrameV2Context<env, path, input, state>
}>

export async function getFrameV2Context<
  env extends Env,
  path extends string,
  input extends Input = {},
  state = env['State'],
>(
  parameters: GetFrameV2ContextParameters<env, path, input, state>,
): GetFrameV2ContextReturnType<env, path, input, state> {
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
      res: (data) => ({ data, format: 'frame', status: 'success' }),
      var: context.var,
    },
  }
}
