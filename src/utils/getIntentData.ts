import { type JSXNode } from 'hono/jsx'
import { type FrameIntentData } from '../types.js'

export function getIntentData(
  intents: readonly JSXNode[] | null,
): FrameIntentData[] {
  if (!intents) return []

  const intentData: FrameIntentData[] = []
  for (const intent of intents) {
    if (!intent) continue
    const { property } = intent.props
    const data: FrameIntentData[] = []
    for (const [key, value] of Object.entries(intent.props)) {
      if (key === 'property' && typeof value === 'string') {
        const match = value?.match(/^fc:frame:(button|input)(:[a-zA-Z0-9]+)$/)
        if (match) data.push(match[1])
      }
      if (!key.startsWith('data-')) continue
      data.push(`${key.replace('data-', '')}:${value}`)
    }
    if (Object.keys(data).length === 0) continue

    // Currently only adding buttons to the intentData array, but in the future,
    // we may want to add more.
    if (property.includes('fc:frame:button')) intentData.push(data.join(';'))
  }
  return intentData
}
