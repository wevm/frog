import type { Input } from 'hono'
import type {
  CastActionBaseContext,
  CastActionContext,
} from '../types/context.js'
import type { Env } from '../types/env.js'

type GetCastActionContextParameters<
  env extends Env = Env,
  path extends string = string,
  input extends Input = {},
> = {
  context: CastActionBaseContext<env, path, input>
}

type GetCastActionContextReturnType<
  env extends Env = Env,
  path extends string = string,
  input extends Input = {},
> = {
  context: CastActionContext<env, path, input>
}

export function getCastActionContext<
  env extends Env,
  path extends string,
  input extends Input = {},
>(
  parameters: GetCastActionContextParameters<env, path, input>,
): GetCastActionContextReturnType<env, path, input> {
  const { context } = parameters
  const { env, actionData, req, verified } = context || {}

  if (!actionData)
    throw new Error('Action data must be present for action handlers.')

  return {
    context: {
      actionData: {
        buttonIndex: 1,
        castId: actionData.castId,
        fid: actionData.fid,
        network: actionData.network,
        messageHash: actionData.messageHash,
        timestamp: actionData.timestamp,
        url: actionData.url,
      },
      env,
      error: (data) => ({
        error: data,
        format: 'castAction',
        status: 'error',
      }),
      frame: (data) => ({
        data: { path: data.path, type: 'frame' },
        format: 'castAction',
        status: 'success',
      }),
      message: (data) => ({
        data: { message: data.message, type: 'message' },
        format: 'castAction',
        status: 'success',
      }),
      req,
      res: (data) => ({
        data,
        format: 'castAction',
        status: 'success',
      }),
      var: context.var,
      verified,
    },
  }
}
