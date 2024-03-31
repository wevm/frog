import type { Input } from 'hono'
import type { Context, ActionContext } from '../types/context.js'
import type { Env } from '../types/env.js'

type GetActionContextParameters<
  env extends Env = Env,
  path extends string = string,
  input extends Input = {},
> = {
  context: Context<env, path, input>
  origin: string
}

type GetActionContextReturnType<
  env extends Env = Env,
  path extends string = string,
  input extends Input = {},
> = {
  context: ActionContext<env, path, input>
}

export function getActionContext<
  env extends Env,
  path extends string,
  input extends Input = {},
>(
  parameters: GetActionContextParameters<env, path, input>,
): GetActionContextReturnType<env, path, input> {
  const { context, origin } = parameters
  const { env, frameData, req, verified } = context || {}

  if (!frameData)
    throw new Error('Frame data must be present for action handlers.')

  return {
    context: {
      env,
      actionData: {
        buttonIndex: 1,
        castId: frameData.castId,
        fid: frameData.fid,
        network: frameData.network,
        messageHash: frameData.messageHash,
        timestamp: frameData.timestamp,
        url: frameData.url,
      },
      origin,
      req,
      res: (data) => ({ data, format: 'action' }),
      var: context.var,
      verified,
    },
  }
}
