import type { Input } from 'hono'
import type { ComposerActionContext, Context } from '../types/context.js'
import type { Env } from '../types/env.js'

type GetComposerActionContextParameters<
  env extends Env = Env,
  path extends string = string,
  input extends Input = {},
> = {
  context: Context<env, path, input>
}

type GetComposerActionContextReturnType<
  env extends Env = Env,
  path extends string = string,
  input extends Input = {},
> = {
  context: ComposerActionContext<env, path, input>
}

export function getComposerActionContext<
  env extends Env,
  path extends string,
  input extends Input = {},
>(
  parameters: GetComposerActionContextParameters<env, path, input>,
): GetComposerActionContextReturnType<env, path, input> {
  const { context } = parameters
  const { env, frameData, req, verified } = context || {}

  if (!frameData)
    throw new Error('Frame data must be present for action handlers.')
  if (!frameData.state)
    throw new Error('State must be present for composer action handler.')

  return {
    context: {
      actionData: {
        buttonIndex: 1,
        castId: frameData.castId,
        fid: frameData.fid,
        network: frameData.network,
        messageHash: frameData.messageHash,
        timestamp: frameData.timestamp,
        state: JSON.parse(decodeURIComponent(frameData.state)),
        url: frameData.url,
      },
      env,
      error: (data) => ({
        error: data,
        format: 'composerAction',
        status: 'error',
      }),
      req,
      res: (data) => ({
        data,
        format: 'composerAction',
        status: 'success',
      }),
      var: context.var,
      verified,
    },
  }
}
