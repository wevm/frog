import type { Context } from 'hono'
import { produce } from 'immer'
import { type FrameContext, type PreviousFrameContext } from '../types.js'
import { getIntentState } from './getIntentState.js'
import { parsePath } from './parsePath.js'

type GetFrameContextParameters<state = unknown> = {
  context: Pick<FrameContext<string, state>, 'frameData' | 'status' | 'url'>
  initialState?: state
  previousContext: PreviousFrameContext<state> | undefined
  request: Context['req']
}

export async function getFrameContext<state>(
  options: GetFrameContextParameters<state>,
): Promise<FrameContext<string, state>> {
  const { context, previousContext, request } = options
  const { frameData } = context || {}

  const { buttonValue, inputText, redirect, reset } = getIntentState(
    frameData,
    previousContext?.intentData || [],
  )

  const status = (() => {
    if (redirect) return 'redirect'
    if (reset) return 'initial'
    return context.status || 'initial'
  })()

  // If the user has clicked a reset button, we want to set the URL back to the
  // initial URL.
  const url =
    (reset ? context.frameData?.url : undefined) || parsePath(context.url)

  let previousState = previousContext?.previousState || options.initialState
  function deriveState(derive?: (state: state) => void): state {
    if (status === 'response' && derive)
      previousState = produce(previousState, derive)
    return previousState as state
  }

  return {
    buttonValue,
    frameData,
    inputText,
    deriveState,
    previousState: previousState as any,
    request,
    status,
    url,
  }
}
