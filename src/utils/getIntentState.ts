import { type JSXNode } from 'hono/jsx'

import { type FrameData } from '../types.js'

export function getIntentState(
  frameData: FrameData | undefined,
  intents: readonly JSXNode[] | null,
) {
  const { buttonIndex, inputText } = frameData || {}

  const state = {
    buttonIndex,
    buttonValue: undefined,
    inputText,
    redirect: false,
    reset: false,
  }
  if (!intents) return state

  if (buttonIndex) {
    const buttonIntents = intents.filter((intent) =>
      intent?.props?.property?.match(/fc:frame:button:\d$/),
    )
    const intent = buttonIntents[buttonIndex - 1]

    const type = intent.props['data-type']
    if (type === 'redirect') state.redirect = true
    else if (type === 'reset') state.reset = true

    const value = intent.props['data-value']
    state.buttonValue = value
  }

  return state
}
