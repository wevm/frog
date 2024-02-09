import type { Context } from 'hono'

import type { FrameContext, PreviousFrameContext } from '../types.js'
import { getIntentState } from './getIntentState.js'
import { toBaseUrl } from './toBaseUrl.js'

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

  return {
    buttonIndex,
    buttonValue,
    inputText,
    request: req,
    status,
    trustedData,
    untrustedData,
    url: toBaseUrl(req.url),
  }
}
