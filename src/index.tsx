import {
  FrameActionBody,
  Message,
  NobleEd25519Signer,
  makeFrameAction,
} from '@farcaster/core'
import { bytesToHex } from '@noble/curves/abstract/utils'
import { ed25519 } from '@noble/curves/ed25519'
import { Window } from 'happy-dom'
import { type Context, Hono } from 'hono'
import { ImageResponse } from 'hono-og'
import { type JSXNode } from 'hono/jsx'
import { jsxRenderer } from 'hono/jsx-renderer'
import type { HtmlEscapedString } from 'hono/utils/html'

import { Preview, previewStyles } from './preview.js'
import {
  type Frame,
  type FrameButton,
  type FrameData,
  type FrameImageAspectRatio,
  type FrameMetaTagPropertyName,
  type FrameVersion,
  type TrustedData,
  type UntrustedData,
} from './types.js'

type FrameContext = {
  buttonIndex?: number
  buttonValue?: string
  inputText?: string
  /**
   * Status of the frame in the frame lifecycle.
   * - `initial` - The frame has not yet been interacted with.
   * - `response` - The frame has been interacted with (user presses button).
   */
  status: 'initial' | 'response'
  trustedData?: TrustedData | undefined
  untrustedData?: UntrustedData | undefined
  url: Context['req']['url']
}

type PreviousFrameContext = FrameContext & {
  /** Intents from the previous frame. */
  intents: JSXNode[]
}

type Intent = JSX.Element | false | null | undefined
type Intents = Intent | Intent[]
type FrameHandlerReturnType = {
  // TODO: Support `fc:frame:image:aspect_ratio`
  image: JSX.Element
  intents?: Intents | undefined
}

export class Farc extends Hono {
  frame(
    path: string,
    handler: (
      context: FrameContext,
      previousContext?: PreviousFrameContext | undefined,
    ) => FrameHandlerReturnType | Promise<FrameHandlerReturnType>,
  ) {
    // Frame Route (implements GET & POST).
    this.use(path, async (c) => {
      const query = c.req.query()
      const previousContext =
        query.previousContext && query.previousContext !== 'undefined'
          ? deserializeJson<PreviousFrameContext>(query.previousContext)
          : undefined
      const context = await getFrameContext(c, previousContext)

      const { intents } = await handler(context, previousContext)
      const parsedIntents = intents ? parseIntents(intents) : null

      const serializedContext = serializeJson(context)
      const serializedPreviousContext = serializeJson({
        ...context,
        intents: parsedIntents,
      })

      return c.render(
        <html lang="en">
          <head>
            <meta property="fc:frame" content="vNext" />
            <meta
              property="fc:frame:image"
              content={`${toBaseUrl(
                context.url,
              )}/image?context=${serializedContext}&previousContext=${
                query.previousContext
              }`}
            />
            <meta
              property="og:image"
              content={`${toBaseUrl(
                context.url,
              )}/image?context=${serializedContext}&previousContext=${
                query.previousContext
              }`}
            />
            <meta
              property="fc:frame:post_url"
              content={`${toBaseUrl(
                context.url,
              )}?previousContext=${serializedPreviousContext}`}
            />
            {parsedIntents}
          </head>
        </html>,
      )
    })

    // OG Image Route
    this.get(`${toBaseUrl(path)}/image`, async (c) => {
      const query = c.req.query()
      const parsedContext = deserializeJson<FrameContext>(query.context)
      const parsedPreviousContext =
        query.previousContext && query.previousContext !== 'undefined'
          ? deserializeJson<PreviousFrameContext>(query.previousContext)
          : undefined
      const { image } = await handler(parsedContext, parsedPreviousContext)
      return new ImageResponse(image)
    })

    // Frame Preview Routes
    this.use(
      `${toBaseUrl(path)}/preview`,
      jsxRenderer(
        ({ children }) => {
          return (
            <html lang="en">
              <head>
                <title>𝑭𝒂𝒓𝒄 Preview</title>
                <style>{previewStyles()}</style>
              </head>
              <body style={{ padding: '1rem' }}>{children}</body>
            </html>
          )
        },
        { docType: true },
      ),
    )
      .get(async (c) => {
        const baseUrl = c.req.url.replace('/preview', '')
        const response = await fetch(baseUrl)
        const text = await response.text()
        const frame = htmlToFrame(text)
        return c.render(<Preview baseUrl={baseUrl} frame={frame} />)
      })
      .post(async (c) => {
        const baseUrl = c.req.url.replace('/preview', '')

        const formData = await c.req.formData()
        const buttonIndex = parseInt(
          typeof formData.get('buttonIndex') === 'string'
            ? (formData.get('buttonIndex') as string)
            : '',
        )
        // TODO: Sanitize input
        const inputText = formData.get('inputText')
          ? Buffer.from(formData.get('inputText') as string)
          : undefined

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
        const response = await fetch(formData.get('action') as string, {
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

        return c.render(<Preview baseUrl={baseUrl} frame={frame} />)
      })

    // TODO: fix this – does it work?
    // Package up the above routes into `path`.
    // this.route(path, this)
  }
}

////////////////////////////////////////////////////////////////////////
// Components
////////////////////////////////////////////////////////////////////////

export type ButtonProps = {
  children: string
  index?: number | undefined
}

export type ButtonRootProps = ButtonProps & {
  action?: 'post' | 'post_redirect'
  value?: string | undefined
}

// TODO: `fc:frame:button:$idx:action` and `fc:frame:button:$idx:target`
ButtonRoot.__type = 'button'
export function ButtonRoot({
  action = 'post',
  children,
  index = 0,
  value,
}: ButtonRootProps) {
  return [
    <meta
      property={`fc:frame:button:${index}`}
      content={children}
      data-value={value}
    />,
    <meta property={`fc:frame:button:${index}:action`} content={action} />,
  ] as unknown as HtmlEscapedString
}

export type ButtonLinkProps = ButtonProps & {
  href: string
}

ButtonLink.__type = 'button'
export function ButtonLink({ children, index = 0, href }: ButtonLinkProps) {
  return [
    <meta
      property={`fc:frame:button:${index}`}
      content={children}
      data-href={href}
    />,
    <meta property={`fc:frame:button:${index}:action`} content="link" />,
    <meta property={`fc:frame:button:${index}:target`} content={href} />,
  ] as unknown as HtmlEscapedString
}

export type ButtonMintProps = ButtonProps & {
  target: string
}

ButtonMint.__type = 'button'
export function ButtonMint({ children, index = 0, target }: ButtonMintProps) {
  return [
    <meta
      property={`fc:frame:button:${index}`}
      content={children}
      data-target={target}
    />,
    <meta property={`fc:frame:button:${index}:action`} content="mint" />,
    <meta property={`fc:frame:button:${index}:target`} content={target} />,
  ] as unknown as HtmlEscapedString
}

export type ButtonResetProps = ButtonProps

ButtonReset.__type = 'button'
export function ButtonReset({ children, index = 0 }: ButtonResetProps) {
  return (
    <meta
      property={`fc:frame:button:${index}`}
      content={children}
      data-type="reset"
    />
  )
}

export const Button = Object.assign(ButtonRoot, {
  Link: ButtonLink,
  Mint: ButtonMint,
  Reset: ButtonReset,
})

export type TextInputProps = {
  placeholder?: string | undefined
}

TextInput.__type = 'text-input'
export function TextInput({ placeholder }: TextInputProps) {
  return <meta property="fc:frame:input:text" content={placeholder} />
}

////////////////////////////////////////////////////////////////////////
// Utilities
////////////////////////////////////////////////////////////////////////

function getIntentState(
  frameData: FrameData | undefined,
  intents: JSXNode[] | null,
) {
  const { buttonIndex, inputText } = frameData || {}
  const state = { buttonIndex, buttonValue: undefined, inputText, reset: false }
  if (!intents) return state
  if (buttonIndex) {
    const buttonIntents = intents.filter((intent) =>
      intent?.props.property.match(/fc:frame:button:\d$/),
    )
    const intent = buttonIntents[buttonIndex - 1]
    state.buttonValue = intent.props['data-value']
    if (intent.props['data-type'] === 'reset') state.reset = true
  }
  return state
}

type Counter = { button: number }

async function getFrameContext(
  ctx: Context,
  previousFrameContext: PreviousFrameContext | undefined,
): Promise<FrameContext> {
  const { req } = ctx
  const { trustedData, untrustedData } =
    (await req.json().catch(() => {})) || {}

  const { buttonIndex, buttonValue, inputText, reset } = getIntentState(
    // TODO: derive from untrusted data.
    untrustedData,
    previousFrameContext?.intents || [],
  )

  const status = (() => {
    if (reset) return 'initial'
    if (req.method === 'POST') return 'response'
    return 'initial'
  })()

  return {
    buttonIndex,
    buttonValue,
    inputText,
    status,
    trustedData,
    untrustedData,
    url: toBaseUrl(req.url),
  }
}

function parseIntents(intents_: Intents) {
  const nodes = intents_ as unknown as JSXNode | JSXNode[]
  const counter: Counter = {
    button: 1,
  }

  const intents = (() => {
    if (Array.isArray(nodes))
      return nodes.map((e) => parseIntent(e as JSXNode, counter))
    if (typeof nodes.children[0] === 'object')
      return Object.assign(nodes, {
        children: nodes.children.map((e) => parseIntent(e as JSXNode, counter)),
      })
    return parseIntent(nodes, counter)
  })()

  return (Array.isArray(intents) ? intents : [intents]).flat()
}

function parseIntent(node_: JSXNode, counter: Counter) {
  // Check if the node is a "falsy" node (ie. `null`, `undefined`, `false`, etc).
  const node = (
    !node_ ? { children: [], props: {}, tag() {} } : node_
  ) as JSXNode

  const props = (() => {
    if ((node.tag as any).__type === 'button')
      return { ...node.props, children: node.children, index: counter.button++ }
    if ((node.tag as any).__type === 'text-input')
      return { ...node.props, children: node.children }
    return {}
  })()

  return (typeof node.tag === 'function' ? node.tag(props) : node) as JSXNode
}

function toBaseUrl(path_: string) {
  let path = path_.split('?')[0]
  if (path.endsWith('/')) path = path.slice(0, -1)
  return path
}

function deserializeJson<returnType>(data = '{}'): returnType {
  if (data === 'undefined') return {} as returnType
  return JSON.parse(decodeURIComponent(data))
}

function serializeJson(data: unknown = {}) {
  return encodeURIComponent(JSON.stringify(data))
}

export function htmlToMetaTags(html: string) {
  const window = new Window()
  window.document.write(html)
  const document = window.document
  return document.querySelectorAll(
    'meta',
  ) as unknown as readonly HTMLMetaElement[]
}

export function parseFrameProperties(metaTags: readonly HTMLMetaElement[]) {
  const validPropertyNames = new Set<FrameMetaTagPropertyName>([
    'fc:frame',
    'fc:frame:image',
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

function htmlToFrame(html: string) {
  const metaTags = htmlToMetaTags(html)
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
