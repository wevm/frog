import { type Context, Hono } from 'hono'
import { ImageResponse } from 'hono-og'
import { type JSXNode } from 'hono/jsx'
import { Window } from 'happy-dom'
import { jsxRenderer } from 'hono/jsx-renderer'

import {
  type Frame,
  type FrameButton,
  type FrameMetaTagPropertyName,
  type FrameVersion,
} from './types.js'

type FrameContext = Context & {
  trustedData?: { messageBytes: string }
  untrustedData?: {
    fid: number
    url: string
    messageHash: string
    timestamp: number
    network: number
    buttonIndex?: 1 | 2 | 3 | 4
    castId: { fid: number; hash: string }
    inputText?: string
  }
}

type FrameReturnType = {
  image: JSX.Element
  intents: JSX.Element
}

export class Framework extends Hono {
  frame(
    path: string,
    handler: (c: FrameContext) => FrameReturnType | Promise<FrameReturnType>,
  ) {
    this.get(
      '/preview',
      jsxRenderer(
        ({ children }) => {
          return (
            <html lang="en">
              <body>{children}</body>
            </html>
          )
        },
        { docType: true },
      ),
    )

    this.get('/preview/*', async (c) => {
      const baseUrl = c.req.url.replace('/preview', '')
      const response = await fetch(baseUrl)
      const html = await response.text()
      const frame = htmlToFrame(html)
      return c.render(
        <div>
          <img alt="Farcaster frame" src={frame.imageUrl} />
        </div>,
      )
    })

    this.get(path, async (c) => {
      const { intents } = await handler(c)
      return c.render(
        <html lang="en">
          <head>
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:image" content={`${c.req.url}_og`} />
            <meta property="og:image" content={`${c.req.url}_og`} />
            <meta property="fc:frame:post_url" content={c.req.url} />
            {parseIntents(intents)}
          </head>
        </html>,
      )
    })

    // TODO: don't slice
    this.get(`${path.slice(1)}_og`, async (c) => {
      const { image } = await handler(c)
      return new ImageResponse(image)
    })

    this.post(path, async (c) => {
      const context = await parsePostContext(c)
      const { intents } = await handler(context)
      return c.render(
        <html lang="en">
          <head>
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:image" content={`${c.req.url}_og`} />
            <meta property="og:image" content={`${c.req.url}_og`} />
            <meta property="fc:frame:post_url" content={c.req.url} />
            {parseIntents(intents)}
          </head>
        </html>,
      )
    })
  }
}

////////////////////////////////////////////////////////////////////////
// Components

export type ButtonProps = {
  children: string
}

export function Button({ children }: ButtonProps) {
  return <meta property="fc:frame:button" content={children} />
}

////////////////////////////////////////////////////////////////////////
// Utilities

type Counter = { button: number }

async function parsePostContext(ctx: Context): Promise<FrameContext> {
  const { trustedData, untrustedData } =
    (await ctx.req.json().catch(() => {})) || {}
  return Object.assign(ctx, { trustedData, untrustedData })
}

function parseIntents(intents_: JSX.Element) {
  const intents = intents_ as unknown as JSXNode
  const counter: Counter = {
    button: 1,
  }

  if (typeof intents.children[0] === 'object')
    return Object.assign(intents, {
      children: intents.children.map((e) => parseIntent(e as JSXNode, counter)),
    })
  return parseIntent(intents, counter)
}

function parseIntent(node: JSXNode, counter: Counter) {
  const intent = (
    typeof node.tag === 'function' ? node.tag({}) : node
  ) as JSXNode

  const props = intent.props || {}

  if (props.property === 'fc:frame:button') {
    props.property = `fc:frame:button:${counter.button++}`
    props.content = node.children
  }

  return Object.assign(intent, { props })
}

function htmlToFrame(html: string) {
  const window = new Window()
  window.document.write(html)
  const document = window.document
  const metaTags = document.querySelectorAll(
    'meta',
  ) as unknown as readonly HTMLMetaElement[]

  const validPropertyNames = new Set<FrameMetaTagPropertyName>([
    'fc:frame',
    'fc:frame:image',
    'fc:frame:input:text',
    'fc:frame:post_url',
    'og:image',
    'og:title',
  ])
  // https://regexr.com/7rlm0
  const buttonRegex = /fc:frame:button:(1|2|3|4)(?::(action|target))?$/

  let currentButtonIndex = 0
  let buttonsAreMissing = false
  let buttonsAreOutOfOrder = false
  const buttonMap = new Map<number, Omit<FrameButton, 'type'>>()
  const buttonActionMap = new Map<number, FrameButton['type']>()
  const invalidButtons: FrameButton['index'][] = []

  const properties: Partial<Record<FrameMetaTagPropertyName, string>> = {}
  for (const metaTag of metaTags) {
    const property = metaTag.getAttribute(
      'property',
    ) as FrameMetaTagPropertyName | null
    if (!property) continue

    const content = metaTag.getAttribute('content') ?? ''
    if (validPropertyNames.has(property)) properties[property] = content
    else if (buttonRegex.test(property)) {
      const matchArray = property.match(buttonRegex) as [
        string,
        string,
        string | undefined,
      ]
      const index = parseInt(matchArray[1], 10) as FrameButton['index']
      const type = matchArray[2] as FrameButton['type'] | undefined

      if (type) buttonActionMap.set(index, content as FrameButton['type'])
      else {
        if (currentButtonIndex >= index) buttonsAreOutOfOrder = true
        if (currentButtonIndex + 1 === index) currentButtonIndex = index
        else buttonsAreMissing = true

        if (buttonsAreOutOfOrder || buttonsAreMissing)
          invalidButtons.push(index)

        const title = content ?? index
        buttonMap.set(index, { index, title })
      }
    }
  }

  const image = properties['og:image'] ?? ''
  const imageUrl = properties['fc:frame:image'] ?? ''
  const postUrl = properties['fc:frame:post_url'] ?? ''
  const title = properties['og:title'] ?? ''
  const version = (properties['fc:frame'] as FrameVersion) ?? 'vNext'

  let buttons = [] as FrameButton[]
  for (const [index, button] of buttonMap) {
    buttons.push({
      ...button,
      type: buttonActionMap.get(index) ?? 'post',
    })
  }
  buttons = buttons.toSorted((a, b) => a.index - b.index)

  const fallbackImageToUrl = !imageUrl
  const postUrlTooLong = postUrl.length > 2_048
  // TODO: Figure out how this is determined
  // https://warpcast.com/~/developers/frames
  const valid = true

  const frame = { buttons, imageUrl, postUrl, version }
  return {
    ...frame,
    debug: {
      ...frame,
      buttonsAreOutOfOrder: buttonsAreMissing || buttonsAreOutOfOrder,
      fallbackImageToUrl,
      htmlTags: metaTags.map((x) => x.outerHTML),
      image,
      invalidButtons,
      postUrlTooLong,
      valid,
    },
    title,
  } satisfies Frame
}
