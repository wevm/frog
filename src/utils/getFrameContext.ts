import { type HonoRequest } from 'hono'
import { produce } from 'immer'
import type { Context, FrameContext } from '../types/context.js'
import { getIntentState } from './getIntentState.js'
import { parsePath } from './parsePath.js'

type GetFrameContextParameters<state = unknown> = {
  context: Context
  cycle: FrameContext['cycle']
  initialState?: state
  req: HonoRequest
  state?: state
}

export function getFrameContext<state>(
  parameters: GetFrameContextParameters<state>,
): FrameContext<string, state> {
  const { context, cycle, req, state } = parameters
  const { frameData, initialPath, previousButtonValues, verified } =
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
  const url =
    (reset ? `${new URL(req.url).origin}${initialPath}` : undefined) ||
    parsePath(context.url)

  let previousState = (() => {
    if (context.status === 'initial') return parameters.initialState
    return context?.previousState || parameters.initialState
  })()

  function deriveState(derive?: (state: state) => void): state {
    if (status === 'response' && derive) {
      if (cycle === 'image') return state as state
      previousState = produce(previousState, derive)
    }
    return previousState as state
  }

  return {
    buttonIndex: frameData?.buttonIndex,
    buttonValue,
    cycle,
    frameData,
    initialPath,
    inputText,
    deriveState,
    getState: () => previousState as state,
    previousButtonValues,
    previousState: previousState as any,
    req,
    res: (data) => data,
    status,
    transactionId: frameData?.transactionId,
    url,
    verified,
  }
}
