import { type Context } from 'hono'
import { produce } from 'immer'
import { type FrameContext } from '../types.js'
import { getIntentState } from './getIntentState.js'
import { parsePath } from './parsePath.js'

type GetFrameContextParameters<state = unknown> = {
  context: Pick<
    FrameContext<string, state>,
    | 'initialPath'
    | 'previousState'
    | 'previousButtonValues'
    | 'frameData'
    | 'status'
    | 'url'
    | 'verified'
  >
  initialState?: state
  request: Context['req']
}

export async function getFrameContext<state>(
  options: GetFrameContextParameters<state>,
): Promise<FrameContext<string, state>> {
  const { context, request } = options
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
    (reset ? `${new URL(request.url).origin}${initialPath}` : undefined) ||
    parsePath(context.url)

  let previousState = (() => {
    if (context.status === 'initial') return options.initialState
    return context?.previousState || options.initialState
  })()
  function deriveState(derive?: (state: state) => void): state {
    if (status === 'response' && derive)
      previousState = produce(previousState, derive)
    return previousState as state
  }

  return {
    buttonIndex: frameData?.buttonIndex,
    buttonValue,
    frameData,
    initialPath,
    inputText,
    deriveState,
    previousButtonValues,
    previousState: previousState as any,
    request,
    status,
    url,
    verified,
  }
}
