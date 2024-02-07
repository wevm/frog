import { Window } from 'happy-dom'
import { type Context, Hono } from 'hono'
import { ImageResponse } from 'hono-og'
import { type JSXNode } from 'hono/jsx'
import { jsxRenderer } from 'hono/jsx-renderer'
import * as ed from '@noble/ed25519'
import { bytesToHex } from 'viem/utils'
import {
  NobleEd25519Signer,
  makeFrameAction,
  Message,
  FrameActionBody,
} from '@farcaster/core'

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

const renderer = jsxRenderer(
  ({ children }) => {
    return (
      <html lang="en">
        <body>{children}</body>
      </html>
    )
  },
  { docType: true },
)

export class Framework extends Hono {
  frame(
    path: string,
    handler: (c: FrameContext) => FrameReturnType | Promise<FrameReturnType>,
  ) {
    this.get('/preview', renderer)
    this.post('/preview', renderer)

    this.get('/preview/*', async (c) => {
      const baseUrl = c.req.url.replace('/preview', '')
      const response = await fetch(baseUrl)
      const text = await response.text()
      const frame = htmlToFrame(text)
      return c.render(
        <>
          <FramePreview baseUrl={baseUrl} frame={frame} />
        </>,
      )
    })

    this.post('/preview', async (c) => {
      const baseUrl = c.req.url.replace('/preview', '')

      const formData = await c.req.formData()
      const buttonIndex = parseInt(
        typeof formData.get('buttonIndex') === 'string'
          ? (formData.get('buttonIndex') as string)
          : '',
      )
      const inputText = formData.get('inputText')
        ? Buffer.from(formData.get('inputText') as string)
        : undefined

      const privateKeyBytes = ed.utils.randomPrivateKey()
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

      const fid = 2
      const castId = {
        fid,
        hash: new Uint8Array(
          Buffer.from('0000000000000000000000000000000000000000', 'hex'),
        ),
      }
      const frameActionBody = FrameActionBody.create({
        url: Buffer.from(baseUrl),
        buttonIndex,
        castId,
        inputText,
      })
      const frameActionMessage = await makeFrameAction(
        frameActionBody,
        { fid, network: 1 },
        new NobleEd25519Signer(privateKeyBytes),
      )

      const message = frameActionMessage._unsafeUnwrap()
      const response = await fetch(baseUrl, {
        method: 'POST',
        body: JSON.stringify({
          untrustedData: {
            buttonIndex,
            castId: {
              fid: castId.fid,
              hash: bytesToHex(castId.hash),
            },
            fid,
            inputText,
            messageHash: bytesToHex(message.hash),
            network: 1,
            timestamp: message.data.timestamp,
            url: baseUrl,
          },
          trustedData: {
            messageBytes: Buffer.from(
              Message.encode(message).finish(),
            ).toString('hex'),
          },
        }),
      })
      const text = await response.text()
      // TODO: handle redirects
      const frame = htmlToFrame(text)

      return c.render(
        <>
          <FramePreview baseUrl={baseUrl} frame={frame} />
        </>,
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

type FramePreviewProps = {
  baseUrl: string
  frame: Frame
}

function FramePreview({ baseUrl, frame }: FramePreviewProps) {
  return (
    <div>
      <form action="/preview" method="post">
        <input type="hidden" name="action" value={frame.postUrl} />
        <div>
          <img alt={frame.title ?? 'Farcaster frame'} src={frame.imageUrl} />
          <div>{new URL(baseUrl).host}</div>
        </div>
        {/* TODO: Text input */}
        {frame.buttons && (
          <div>
            {frame.buttons.map((button) => (
              <button
                key={button.index}
                type="submit"
                name="buttonIndex"
                value={button.index}
              >
                {button.title}
              </button>
            ))}
          </div>
        )}
      </form>
    </div>
  )
}

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
