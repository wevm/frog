import { produce } from 'immer'
import type { Context, FrameContext } from '../types/context.js'
import type { Env } from '../types/env.js'
import { getIntentState } from './getIntentState.js'
import { parsePath } from './parsePath.js'

type GetFrameContextParameters<
  env extends Env = Env,
  path extends string = string,
  //
  _state = env['State'],
> = {
  context: Context<env, path>
  cycle: FrameContext['cycle']
  initialState?: _state
  state?: _state
}

type GetFrameContextReturnType<
  env extends Env = Env,
  path extends string = string,
  //
  _state = env['State'],
> = {
  context: FrameContext<env, path>
  getState: () => _state
}

export function getFrameContext<
  env extends Env,
  path extends string,
  //
  _state = env['State'],
>(
  parameters: GetFrameContextParameters<env, path, _state>,
): GetFrameContextReturnType<env, path, _state> {
  const { context, cycle, state } = parameters
  const {
    frameData,
    get,
    initialPath,
    previousButtonValues,
    req,
    set,
    verified,
  } = context || {}

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
  const url =
    (reset ? `${new URL(req.url).origin}${initialPath}` : undefined) ||
    parsePath(context.url)

  let previousState = (() => {
    if (context.status === 'initial') return parameters.initialState
    return context?.previousState || parameters.initialState
  })()

  function deriveState(derive?: (state: _state) => void): _state {
    if (status === 'response' && derive) {
      if (cycle === 'image') return state as _state
      previousState = produce(previousState, derive)
    }
    return previousState as _state
  }

  return {
    context: {
      buttonIndex: frameData?.buttonIndex,
      buttonValue,
      cycle,
      deriveState,
      frameData,
      get,
      initialPath,
      inputText,
      previousButtonValues,
      previousState: previousState as any,
      req,
      res: (data) => ({ data, format: 'frame' }),
      set,
      status,
      transactionId: frameData?.transactionId,
      url,
      var: context.var,
      verified,
    },
    getState: () => previousState as _state,
  }
}
