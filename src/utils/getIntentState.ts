import { type FrameData, type FrameIntentData } from '../types.js'

type IntentState = {
  buttonValue: string | undefined
  inputText: string | undefined
  redirect: boolean
  reset: boolean
}

export function getIntentState(
  frameData: FrameData | undefined,
  intentData: readonly FrameIntentData[] | null,
) {
  const { buttonIndex, inputText } = frameData || {}
  const state: IntentState = {
    buttonValue: undefined,
    inputText,
    redirect: false,
    reset: false,
  }
  if (!intentData) return state

  if (buttonIndex) {
    const buttonIntents = intentData.filter((intent) =>
      intent?.property?.match(/fc:frame:button:\d$/),
    )
    const intent = buttonIntents[buttonIndex - 1]

    const type = intent['data-type']
    if (type === 'redirect') state.redirect = true
    else if (type === 'reset') state.reset = true

    const value = intent['data-value']
    state.buttonValue = value
  }

  return state
}
