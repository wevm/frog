import type { JSXNode } from 'hono/jsx'
import type { FrameButtonValue } from '../types/frame.js'

export function getButtonValues(
  intents: readonly JSXNode[] | null,
): FrameButtonValue[] {
  if (!intents) return []

  const buttonValues: FrameButtonValue[] = []
  for (const intent of intents) {
    if (!intent) continue
    const { property } = intent.props
    if (!(property as string).match(/^fc:frame:button:(1|2|3|4)$/)) continue
    buttonValues.push(intent.props['data-value'])
  }
  return buttonValues
}
