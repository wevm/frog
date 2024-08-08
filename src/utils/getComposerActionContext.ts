import type { Input } from 'hono'
import type {
  ComposerActionBaseContext,
  ComposerActionContext,
} from '../types/context.js'
import type { Env } from '../types/env.js'

type GetComposerActionContextParameters<
  env extends Env = Env,
  path extends string = string,
  input extends Input = {},
> = {
  context: ComposerActionBaseContext<env, path, input>
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
  const { env, actionData, req, verified } = context || {}

  if (!actionData)
    throw new Error('Action data must be present for action handlers.')
  if (!actionData.state)
    throw new Error('State must be present for composer action handler.')

  return {
    context: {
      actionData: {
        buttonIndex: 1,
        fid: actionData.fid,
        network: actionData.network,
        messageHash: actionData.messageHash,
        timestamp: actionData.timestamp,
        state: actionData.state,
        url: actionData.url,
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
