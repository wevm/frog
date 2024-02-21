import { type FrameButton } from '../types.js'

export function validateButtons(buttons: readonly FrameButton[]) {
  let buttonsAreOutOfOrder = false
  const invalidButtons: FrameButton['index'][] = []
  for (let i = 0; i < buttons.length; i++) {
    const button = buttons[i]
    const previousButton = buttons[i - 1]

    const isOutOfOrder = button.index < (previousButton?.index ?? 0)
    const isButtonMissing = button.index !== i + 1
    if (isOutOfOrder || isButtonMissing) buttonsAreOutOfOrder = true

    // TODO: `invalidButtons`
    // link must have target in format
    // mint must have target in format
  }
  return { buttonsAreOutOfOrder, invalidButtons }
}
