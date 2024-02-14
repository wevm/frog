import type { JSXNode } from 'hono/jsx'
import type { FrameIntentData } from '../types.js'

export function getIntentData(
  intents: readonly JSXNode[] | null,
): FrameIntentData[] {
  if (!intents) return []

  const intentData: FrameIntentData[] = []
  for (const intent of intents) {
    if (!intent) continue
    const { property } = intent.props
    const data: FrameIntentData = {}
    for (const [key, value] of Object.entries(intent.props)) {
      if (!key.startsWith('data-')) continue
      data[key] = value
    }
    if (Object.keys(data).length === 0) continue
    intentData.push({
      property,
      ...data,
    })
  }
  return intentData
}
