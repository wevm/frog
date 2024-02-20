import { Message } from '@farcaster/core'
import {
  FrameActionBody,
  NobleEd25519Signer,
  makeFrameAction,
} from '@farcaster/core'
import { bytesToHex } from '@noble/curves/abstract/utils'
import { ed25519 } from '@noble/curves/ed25519'
import { Window } from 'happy-dom'
import { type Context } from 'hono'
import { inspectRoutes } from 'hono/dev'
import QRCodeUtil from 'qrcode'
import { createCssVariablesTheme, getHighlighter } from 'shiki'

import {
  type FrameContext,
  type FrameImageAspectRatio,
  type FrameVersion,
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

export function parseProperties(metaTags: readonly HTMLMetaElement[]) {
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

export function parseButtons(metaTags: readonly HTMLMetaElement[]) {
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

  // Using `sort` over `toSorted` for Node.js < 20 compatibility (ie. Vercel default).
  buttons.sort((a, b) => a.index - b.index)

  return buttons
}

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

export type State = {
  context: FrameContext
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
  }
}

export function htmlToFrame(html: string) {
  const metaTags = htmlToMetaTags(
    html,
    'meta[property^="fc:"], meta[property^="og:"]',
  )
  const properties = parseProperties(metaTags)
  const buttons = parseButtons(metaTags)

  const fallbackImageToUrl = !properties.imageUrl
  const postUrlTooLong = properties.postUrl.length > 256
  const inputTextTooLong = properties.input?.text
    ? properties.input.text.length > 32
    : false

  const { buttonsAreOutOfOrder, invalidButtons } = validateButtons(buttons)

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

export function getRoutes(
  baseUrl: string,
  routes: ReturnType<typeof inspectRoutes>,
) {
  // corrects route paths for `app.route(...)` routes
  const pathname = new URL(baseUrl).pathname
  let basePathname = '/'
  for (const route of routes) {
    if (route.path === '/') {
      basePathname = pathname
    } else {
      const normalizedPathname = pathname.replace(route.path, '')
      if (normalizedPathname === pathname) continue
      basePathname = normalizedPathname
    }
  }

  const frameRoutes = []
  if (basePathname !== '' && basePathname !== '/') frameRoutes.push('/')

  for (const route of routes) {
    if (route.isMiddleware) continue
    if (route.method !== 'ALL') continue

    let path: string
    if (basePathname !== '' && route.path === '/') path = basePathname
    else path = (basePathname === '/' ? '' : basePathname) + route.path
    frameRoutes.push(path)
  }

  return frameRoutes
}

export async function getCodeHtml(code: string, lang: 'json') {
  const theme = createCssVariablesTheme({
    name: 'css-variables',
    variablePrefix: '--shiki-',
    variableDefaults: {},
    fontStyle: true,
  })

  const highlighter = await getHighlighter({
    langs: ['json'],
    themes: [theme],
  })

  return highlighter.codeToHtml(code, {
    lang,
    theme: 'css-variables',
  })
}

export async function getImageSize(url: string) {
  const response = await fetch(url)
  const blob = await response.blob()
  return blob.size
}

export function validatePostBody(
  value: Record<string, string | File>,
  c: Context,
) {
  const buttonIndex = parseInt(value.buttonIndex as string)
  if (buttonIndex < 1 || buttonIndex > 4) return c.text('Invalid data', 400)

  const postUrl = value.postUrl as string
  if (!postUrl) return c.text('Invalid data', 400)

  // TODO: Sanitize input
  const inputText = value.inputText as string | undefined

  // TODO: Make dynamic
  const fid = 2
  const castId = {
    fid,
    hash: new Uint8Array(
      Buffer.from('0000000000000000000000000000000000000000', 'hex'),
    ),
  }

  return { buttonIndex, castId, fid, inputText, postUrl }
}

export async function fetchFrame({
  baseUrl,
  buttonIndex,
  castId,
  fid,
  inputText,
  postUrl,
}: {
  baseUrl: string
  buttonIndex: number
  castId: {
    fid: number
    hash: Uint8Array
  }
  fid: number
  inputText: string | undefined
  postUrl: string
}) {
  const privateKeyBytes = ed25519.utils.randomPrivateKey()

  const frameActionBody = FrameActionBody.create({
    url: Buffer.from(baseUrl),
    buttonIndex,
    castId,
    inputText: inputText ? Buffer.from(inputText) : undefined,
  })
  const frameActionMessage = await makeFrameAction(
    frameActionBody,
    { fid, network: 1 },
    new NobleEd25519Signer(privateKeyBytes),
  )

  const message = frameActionMessage._unsafeUnwrap()

  const t0 = performance.now()
  const response = await fetch(postUrl, {
    method: 'POST',
    body: JSON.stringify({
      untrustedData: {
        buttonIndex,
        castId: {
          fid: castId.fid,
          hash: `0x${bytesToHex(castId.hash)}`,
        },
        fid,
        inputText: inputText
          ? Buffer.from(inputText).toString('utf-8')
          : undefined,
        messageHash: `0x${bytesToHex(message.hash)}`,
        network: 1,
        timestamp: message.data?.timestamp,
        url: baseUrl,
      },
      trustedData: {
        messageBytes: Buffer.from(Message.encode(message).finish()).toString(
          'hex',
        ),
      },
    }),
  })
  const t1 = performance.now()
  const speed = t1 - t0
  return { response, speed }
}

export function generateMatrix(
  value: string,
  errorCorrectionLevel: QRCodeUtil.QRCodeErrorCorrectionLevel,
) {
  const arr = Array.prototype.slice.call(
    QRCodeUtil.create(value, { errorCorrectionLevel }).modules.data,
    0,
  )
  const sqrt = Math.sqrt(arr.length)
  return arr.reduce(
    (rows, key, index) =>
      (index % sqrt === 0
        ? rows.push([key])
        : rows[rows.length - 1].push(key)) && rows,
    [],
  )
}
