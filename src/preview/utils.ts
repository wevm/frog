import { Window } from 'happy-dom'
import {
  type FrameContext,
  type FrameImageAspectRatio,
  type FrameVersion,
  type PreviousFrameContext,
} from '../types.js'
import { deserializeJson } from '../utils/deserializeJson.js'
import {
  type FarcMetaTagPropertyName,
  type Frame,
  type FrameButton,
  type FrameMetaTagPropertyName,
} from './types.js'

export function htmlToMetaTags(html: string, selector: string) {
  const window = new Window()
  window.document.write(html)
  const document = window.document
  return document.querySelectorAll(
    selector,
  ) as unknown as readonly HTMLMetaElement[]
}

export function parseFrameProperties(metaTags: readonly HTMLMetaElement[]) {
  const validPropertyNames = new Set<FrameMetaTagPropertyName>([
    'fc:frame',
    'fc:frame:image',
    'fc:frame:image:aspect_ratio',
    'fc:frame:input:text',
    'fc:frame:post_url',
    'og:image',
    'og:title',
  ])

  const properties: Partial<Record<FrameMetaTagPropertyName, string>> = {}
  for (const metaTag of metaTags) {
    const property = metaTag.getAttribute(
      'property',
    ) as FrameMetaTagPropertyName | null
    if (!property) continue

    const content = metaTag.getAttribute('content') ?? ''
    if (!validPropertyNames.has(property)) continue
    properties[property] = content
  }

  const text = properties['fc:frame:input:text'] ?? ''
  const input = properties['fc:frame:input:text'] ? { text } : undefined

  const image = properties['og:image'] ?? ''
  const imageAspectRatio =
    (properties['fc:frame:image:aspect_ratio'] as FrameImageAspectRatio) ??
    '1.91:1'
  const imageUrl = properties['fc:frame:image'] ?? ''
  const postUrl = properties['fc:frame:post_url'] ?? ''
  const title = properties['og:title'] ?? ''
  const version = (properties['fc:frame'] as FrameVersion) ?? 'vNext'

  return {
    image,
    imageAspectRatio,
    imageUrl,
    input,
    postUrl,
    title,
    version,
  }
}

export function parseFrameButtons(metaTags: readonly HTMLMetaElement[]) {
  // https://regexr.com/7rlm0
  const buttonRegex = /fc:frame:button:(1|2|3|4)(?::(action|target))?$/

  let currentButtonIndex = 0
  let buttonsAreMissing = false
  let buttonsAreOutOfOrder = false
  const buttonMap = new Map<number, Omit<FrameButton, 'target' | 'type'>>()
  const buttonActionMap = new Map<number, FrameButton['type']>()
  const buttonTargetMap = new Map<number, FrameButton['target']>()
  const invalidButtons: FrameButton['index'][] = []

  for (const metaTag of metaTags) {
    const property = metaTag.getAttribute(
      'property',
    ) as FrameMetaTagPropertyName | null
    if (!property) continue

    if (!buttonRegex.test(property)) continue
    const matchArray = property.match(buttonRegex) as [
      string,
      string,
      string | undefined,
    ]
    const index = parseInt(matchArray[1], 10) as FrameButton['index']
    const type = matchArray[2]

    const content = metaTag.getAttribute('content') ?? ''
    if (type === 'action')
      buttonActionMap.set(index, content as FrameButton['type'])
    else if (type === 'target')
      buttonTargetMap.set(index, content as FrameButton['target'])
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
    const type = buttonActionMap.get(index) ?? 'post'
    const target = buttonTargetMap.get(index) as FrameButton['target']
    buttons.push({
      ...button,
      ...(target ? { target } : {}),
      type,
    } as FrameButton)
  }

  return buttons.toSorted((a, b) => a.index - b.index)
}

export function validateFrameButtons(buttons: readonly FrameButton[]) {
  let buttonsAreOutOfOrder = false
  const invalidButtons: FrameButton['index'][] = []
  for (let i = 0; i < buttons.length; i++) {
    const button = buttons[i]
    const previousButton = buttons[i - 1]

    const isOutOfOrder = button.index < previousButton?.index ?? 0
    const isButtonMissing = button.index !== i + 1
    if (isOutOfOrder || isButtonMissing) buttonsAreOutOfOrder = true

    // TODO: `invalidButtons`
    // link must have target in format
    // mint must have target in format
  }
  return { buttonsAreOutOfOrder, invalidButtons }
}

export function htmlToState(html: string) {
  const metaTags = htmlToMetaTags(html, 'meta[property^="farc:"]')

  const properties: Partial<Record<FarcMetaTagPropertyName, string>> = {}
  for (const metaTag of metaTags) {
    const property = metaTag.getAttribute(
      'property',
    ) as FarcMetaTagPropertyName | null
    if (!property) continue

    const content = metaTag.getAttribute('content') ?? ''
    properties[property] = content
  }

  return {
    context: deserializeJson<FrameContext>(properties['farc:context']),
    previousContext: deserializeJson<PreviousFrameContext>(
      properties['farc:prev_context'],
    ),
  }
}

export function htmlToFrame(html: string) {
  const metaTags = htmlToMetaTags(
    html,
    'meta[property^="fc:"], meta[property^="og:"]',
  )
  const properties = parseFrameProperties(metaTags)
  const buttons = parseFrameButtons(metaTags)

  const fallbackImageToUrl = !properties.imageUrl
  const postUrlTooLong = properties.postUrl.length > 256
  const inputTextTooLong = properties.input?.text
    ? properties.input.text.length > 32
    : false

  const { buttonsAreOutOfOrder, invalidButtons } = validateFrameButtons(buttons)

  // TODO: Figure out how this is determined
  // https://warpcast.com/~/developers/frames
  const valid = !(
    postUrlTooLong ||
    inputTextTooLong ||
    Boolean(invalidButtons.length)
  )

  const frame = {
    buttons,
    imageAspectRatio: properties.imageAspectRatio,
    imageUrl: properties.imageUrl,
    input: properties.input,
    postUrl: properties.postUrl,
    version: properties.version,
  }
  return {
    ...frame,
    debug: {
      ...frame,
      buttonsAreOutOfOrder,
      fallbackImageToUrl,
      htmlTags: metaTags.map((x) => x.outerHTML),
      image: properties.image,
      inputTextTooLong,
      invalidButtons,
      postUrlTooLong,
      valid,
    },
    title: properties.title,
  } satisfies Frame
}
