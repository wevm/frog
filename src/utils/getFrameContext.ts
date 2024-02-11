import type { Context } from 'hono'
import { produce } from 'immer'
import { type FrameContext, type PreviousFrameContext } from '../types.js'
import { getIntentState } from './getIntentState.js'
import { parsePath } from './parsePath.js'

type GetFrameContextParameters<state = unknown> = {
  context: Pick<
    FrameContext<string, state>,
    'status' | 'trustedData' | 'untrustedData' | 'url'
  >
  initialState?: state
  previousContext: PreviousFrameContext<string, state> | undefined
  request: Context['req']
}

export async function getFrameContext<state>(
  options: GetFrameContextParameters<state>,
): Promise<FrameContext<string, state>> {
  const { context, previousContext, request } = options
  const { trustedData, untrustedData } = context || {}

  const { buttonIndex, buttonValue, inputText, reset } = getIntentState(
    // TODO: derive from untrusted data.
    untrustedData,
    previousContext?.intents || [],
  )

  const status = (() => {
    if (reset) return 'initial'
    return context.status || 'initial'
  })()

  // If there are no previous contexts, the initial URL is the current URL.
  const initialUrl = !previousContext
    ? parsePath(context.url)
    : previousContext.initialUrl

  // If the user has clicked a reset button, we want to set the URL back to the
  // initial URL.
  const url = reset ? initialUrl : parsePath(context.url)

  let previousState = previousContext?.previousState || options.initialState
  function deriveState(derive?: (state: state) => void): state {
    if (status === 'response' && derive)
      previousState = produce(previousState, derive)
    return previousState as state
  }

  return {
    buttonIndex,
    buttonValue,
    initialUrl,
    inputText,
    deriveState,
    previousState: previousState as any,
    request,
    status,
    trustedData,
    untrustedData,
    url,
  }
}
