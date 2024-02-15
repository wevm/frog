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
    const buttonIntents = intentData.filter((intent) => {
      const [type] = intent?.split(';') || []
      return type === 'button'
    })
    const intent = buttonIntents[buttonIndex - 1]
    const properties = intent?.split(';') || []

    for (const property of properties) {
      const [key, ...rest] = property.split(':')
      const value = rest.join(':')

      if (key === 'type' && value === 'redirect') state.redirect = true
      else if (key === 'type' && value === 'reset') state.reset = true
      else if (key === 'value') state.buttonValue = value
    }
  }

  return state
}
