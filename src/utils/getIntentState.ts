import { buttonPrefix } from '../components/Button.js'
import type { FrameButtonValue, FrameData } from '../types/frame.js'

type IntentState = {
  buttonValue: string | undefined
  inputText: string | undefined
  redirect: boolean
  reset: boolean
}

export function getIntentState({
  buttonValues,
  frameData,
}: {
  buttonValues: readonly FrameButtonValue[] | null
  frameData: FrameData | undefined
}) {
  const { buttonIndex, inputText } = frameData || {}
  const state: IntentState = {
    buttonValue: undefined,
    inputText,
    redirect: false,
    reset: false,
  }
  if (!buttonValues) return state

  if (buttonIndex) {
    const buttonIntents = buttonValues
    const intent = buttonIntents[buttonIndex - 1]
    if (!intent) return state

    if (intent.startsWith(buttonPrefix.reset)) state.reset = true
    else if (intent.startsWith(buttonPrefix.redirect)) {
      state.redirect = true
      state.buttonValue = intent.slice(3)
    } else state.buttonValue = intent
  }

  return state
}
