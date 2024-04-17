import type { Input } from 'hono'
import type { Context, FrameContext } from '../types/context.js'
import type { Env } from '../types/env.js'
import { getIntentState } from './getIntentState.js'
import { parsePath } from './parsePath.js'

type GetFrameContextParameters<
  env extends Env = Env,
  path extends string = string,
  input extends Input = {},
  //
  _state = env['State'],
> = {
  context: Context<env, path, input>
  initialState?: _state
  origin: string
}

type GetFrameContextReturnType<
  env extends Env = Env,
  path extends string = string,
  input extends Input = {},
  //
  _state = env['State'],
> = {
  context: FrameContext<env, path, input>
  getState: () => _state
}

export function getFrameContext<
  env extends Env,
  path extends string,
  input extends Input = {},
  //
  _state = env['State'],
>(
  parameters: GetFrameContextParameters<env, path, input, _state>,
): GetFrameContextReturnType<env, path, input, _state> {
  const { context, origin } = parameters
  const { env, frameData, initialPath, previousButtonValues, req, verified } =
    context || {}

  const { buttonValue, inputText, redirect, reset } = getIntentState({
    buttonValues: previousButtonValues || [],
    frameData,
  })

  const status = (() => {
    if (redirect) return 'redirect'
    if (reset) return 'initial'
    return context.status || 'initial'
  })()

  // If the user has clicked a reset button, we want to set the URL back to the
  // initial URL.
  const url = parsePath(reset ? `${origin}${initialPath}` : context.url)

  let previousState = (() => {
    if (context.status === 'initial') return parameters.initialState
    return context?.previousState || parameters.initialState
  })()

  function deriveState(
    derive?: (state: _state) => void | Promise<void>,
  ): _state | Promise<_state> {
    if (status !== 'response') return previousState as _state
    if (!derive) return previousState as _state

    const clone = structuredClone(previousState)
    if ((derive as any)[Symbol.toStringTag] === 'AsyncFunction')
      return (derive(clone as _state) as any).then(() => {
        previousState = clone
        return previousState
      })

    derive(clone as _state)
    previousState = clone
    return previousState as _state
  }

  return {
    context: {
      buttonIndex: frameData?.buttonIndex,
      buttonValue,
      cycle: 'main',
      deriveState: deriveState as FrameContext['deriveState'],
      env,
      error: (data) => ({
        error: data,
        format: 'frame',
        status: 'error',
      }),
      frameData,
      initialPath,
      inputText,
      previousButtonValues,
      previousState: previousState as any,
      req,
      res: (data) => ({ data, format: 'frame', status: 'success' }),
      status,
      transactionId: frameData?.transactionId,
      url,
      var: context.var,
      verified,
    },
    getState: () => previousState as _state,
  }
}
