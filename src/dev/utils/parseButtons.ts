import type { FrameMetadata } from '../../utils/getFrameMetadata.js'
import type { FrameButton } from '../types.js'

// https://regexr.com/7rlm0
const buttonRegex = /fc:frame:button:(1|2|3|4)(?::(action|post_url|target))?$/

export function parseButtons(metadata: FrameMetadata) {
  let currentButtonIndex = 0
  let buttonsAreMissing = false
  let buttonsAreOutOfOrder = false

  const buttonMap = new Map<
    number,
    Omit<FrameButton, 'postUrl' | 'target' | 'type'>
  >()
  const buttonActionMap = new Map<number, FrameButton['type']>()
  const buttonPostUrlMap = new Map<number, FrameButton['postUrl']>()
  const buttonTargetMap = new Map<number, FrameButton['target']>()
  const invalidButtons: FrameButton['index'][] = []

  for (const meta of metadata) {
    const { property } = meta
    if (!buttonRegex.test(property)) continue
    const matchArray = property.match(buttonRegex) as [
      string,
      string,
      string | undefined,
    ]
    const index = Number.parseInt(matchArray[1], 10) as FrameButton['index']
    const type = matchArray[2]

    const content = meta.content ?? ''
    if (type === 'action')
      buttonActionMap.set(index, content as FrameButton['type'])
    else if (type === 'post_url') buttonPostUrlMap.set(index, content)
    else if (type === 'target') buttonTargetMap.set(index, content)
    else {
      if (currentButtonIndex >= index) buttonsAreOutOfOrder = true
      if (currentButtonIndex + 1 === index) currentButtonIndex = index
      else buttonsAreMissing = true

      if (buttonsAreOutOfOrder || buttonsAreMissing) invalidButtons.push(index)

      const title = content ?? index
      buttonMap.set(index, { index, title })
    }
  }

  const buttons: FrameButton[] = []
  for (const [index, button] of buttonMap) {
    const postUrl = buttonPostUrlMap.get(index)
    const type = buttonActionMap.get(index) ?? 'post'
    const target = buttonTargetMap.get(index) as FrameButton['target']
    buttons.push({
      ...button,
      postUrl,
      target,
      type,
    } as FrameButton)
  }

  // Using `sort` over `toSorted` for Node.js < 20 compatibility (ie. Vercel default).
  buttons.sort((a, b) => a.index - b.index)

  return buttons
}
