import { type JSXNode } from 'hono/jsx'

import { type FrameData } from '../types.js'

export function getIntentState(
  frameData: FrameData | undefined,
  intents: readonly JSXNode[] | null,
) {
  const { buttonIndex, inputText } = frameData || {}
  const state = { buttonIndex, buttonValue: undefined, inputText, reset: false }
  if (!intents) return state
  if (buttonIndex) {
    const buttonIntents = intents.filter((intent) =>
      intent?.props.property.match(/fc:frame:button:\d$/),
    )
    const intent = buttonIntents[buttonIndex - 1]
    state.buttonValue = intent.props['data-value']
    if (intent.props['data-type'] === 'reset') state.reset = true
  }
  return state
}
