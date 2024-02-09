import { type Context } from 'hono'

import { type FrameContext, type PreviousFrameContext } from '../types.js'
import { getIntentState } from './getIntentState.js'
import { parsePath } from './parsePath.js'

export async function getFrameContext(
  ctx: Context,
  previousFrameContext: PreviousFrameContext | undefined,
): Promise<FrameContext> {
  const { req } = ctx
  const { trustedData, untrustedData } =
    (await req.json().catch(() => {})) || {}

  const { buttonIndex, buttonValue, inputText, reset } = getIntentState(
    // TODO: derive from untrusted data.
    untrustedData,
    previousFrameContext?.intents || [],
  )

  const status = (() => {
    if (reset) return 'initial'
    if (req.method === 'POST') return 'response'
    return 'initial'
  })()

  // If there are no previous contexts, the initial URL is the current URL.
  const initialUrl = !previousFrameContext
    ? parsePath(req.url)
    : previousFrameContext.initialUrl

  // If the user has clicked a reset button, we want to set the URL back to the
  // initial URL.
  const url = reset ? initialUrl : parsePath(req.url)

  return {
    buttonIndex,
    buttonValue,
    initialUrl,
    inputText,
    request: req,
    status,
    trustedData,
    untrustedData,
    url,
  }
}
