import {
  FrameActionBody,
  NobleEd25519Signer,
  makeFrameAction,
} from '@farcaster/core'
import { ed25519 } from '@noble/curves/ed25519'
import { Window } from 'happy-dom'
import { inspectRoutes } from 'hono/dev'

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

    const isOutOfOrder = button.index < previousButton?.index ?? 0
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
  previousContext?: PreviousFrameContext | undefined
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
  if (basePathname !== '/') frameRoutes.push('/')

  for (const route of routes) {
    if (route.isMiddleware) continue
    if (route.method !== 'ALL') continue

    let path: string
    if (route.path === '/') path = basePathname
    else path = (basePathname === '/' ? '' : basePathname) + route.path
    frameRoutes.push(path)
  }
  return frameRoutes
}

export function getData(value: Record<string, string | File>) {
  const buttonIndex = parseInt(value.buttonIndex as string)
  if (buttonIndex < 1 || buttonIndex > 4) throw new Error('Invalid buttonIndex')

  const postUrl = value.postUrl as string
  if (!postUrl) throw new Error('Invalid postUrl')

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

export async function fetchFrameMessage({
  baseUrl,
  buttonIndex,
  castId,
  fid,
  inputText,
}: {
  baseUrl: string
  buttonIndex: number
  castId: {
    fid: number
    hash: Uint8Array
  }
  fid: number
  inputText: string | undefined
}) {
  const privateKeyBytes = ed25519.utils.randomPrivateKey()
  // const publicKeyBytes = await ed.getPublicKeyAsync(privateKeyBytes)

  // const key = bytesToHex(publicKeyBytes)
  // const deadline = Math.floor(Date.now() / 1000) + 60 * 60 // now + hour
  //
  // const account = privateKeyToAccount(bytesToHex(privateKeyBytes))
  // const requestFid = 1

  // const signature = await account.signTypedData({
  //   domain: {
  //     name: 'Farcaster SignedKeyRequestValidator',
  //     version: '1',
  //     chainId: 10,
  //     verifyingContract: '0x00000000FC700472606ED4fA22623Acf62c60553',
  //   },
  //   types: {
  //     SignedKeyRequest: [
  //       { name: 'requestFid', type: 'uint256' },
  //       { name: 'key', type: 'bytes' },
  //       { name: 'deadline', type: 'uint256' },
  //     ],
  //   },
  //   primaryType: 'SignedKeyRequest',
  //   message: {
  //     requestFid: BigInt(requestFid),
  //     key,
  //     deadline: BigInt(deadline),
  //   },
  // })

  // const response = await fetch(
  //   'https://api.warpcast.com/v2/signed-key-requests',
  //   {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify({
  //       deadline,
  //       key,
  //       requestFid,
  //       signature,
  //     }),
  //   },
  // )

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

  return frameActionMessage._unsafeUnwrap()
}
