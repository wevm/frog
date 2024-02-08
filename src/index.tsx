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
import type { JSXNode } from 'hono/jsx'
import { jsxRenderer } from 'hono/jsx-renderer'

import {
  type Frame,
  type FrameButton,
  type FrameImageAspectRatio,
  type FrameMetaTagPropertyName,
  type FrameVersion,
  type TrustedData,
  type UntrustedData,
} from './types.js'

type FrameContext = {
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

type Intent = JSX.Element | false | null | undefined
type Intents = Intent | Intent[]
type FrameHandlerReturnType = {
  // TODO: Support `fc:frame:image:aspect_ratio`
  image: JSX.Element
  intents?: Intents | undefined
}

export class Framework extends Hono {
  frame(
    path: string,
    handler: (
      context: FrameContext,
      previousContext?: FrameContext | undefined,
    ) => FrameHandlerReturnType | Promise<FrameHandlerReturnType>,
  ) {
    // Frame Route (implements GET & POST).
    this.use(path, async (c) => {
      const query = c.req.query()
      const previousContext =
        query.previousContext && query.previousContext !== 'undefined'
          ? deserializeJson<FrameContext>(query.previousContext)
          : undefined

      const context = await getFrameContext(c)
      const { intents } = await handler(context, previousContext)

      const serializedContext = serializeJson(context)

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
              )}?previousContext=${serializedContext}`}
            />
            {intents ? parseIntents(intents) : null}
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
          ? deserializeJson<FrameContext>(query.previousContext)
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
                <style>{getGlobalStyles()}</style>
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
        return c.render(<Content baseUrl={baseUrl} frame={frame} />)
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

        return c.render(<Content baseUrl={baseUrl} frame={frame} />)
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
  value?: string | undefined
}

// TODO: `fc:frame:button:$idx:action` and `fc:frame:button:$idx:target`
Button.__type = 'button'
export function Button({ children, index = 0, value }: ButtonProps) {
  return (
    <meta
      property={`fc:frame:button:${index}`}
      content={children}
      data-value={value}
    />
  )
}

export type TextInputProps = {
  placeholder?: string | undefined
}

TextInput.__type = 'text-input'
export function TextInput({ placeholder }: TextInputProps) {
  return <meta property="fc:frame:input:text" content={placeholder} />
}

type ContentProps = {
  baseUrl: string
  frame: Frame
}

function Content({ baseUrl, frame }: ContentProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Preview baseUrl={baseUrl} frame={frame} />
      <Devtools frame={frame} />
    </div>
  )
}

type PreviewProps = {
  baseUrl: string
  frame: Frame
}

function Preview({ baseUrl, frame }: PreviewProps) {
  return (
    <div style={{ maxWidth: '512px', width: '100%' }}>
      <form
        action="/preview"
        method="post"
        style={{
          borderRadius: '0.5rem',
          position: 'relative',
          width: '100%',
        }}
      >
        <div
          style={{
            position: 'relative',
          }}
        >
          <img
            alt={frame.title ?? 'Farcaster frame'}
            src={frame.imageUrl}
            style={{
              aspectRatio: frame.imageAspectRatio.replace(':', '/'),
              borderTopLeftRadius: '.5rem',
              borderTopRightRadius: '0.5rem',
              borderWidth: '1px',
              maxHeight: '526px',
              objectFit: 'cover',
              width: '100%',
            }}
          />
          <div
            style={{
              background: '#00000080',
              borderRadius: '0.25rem',
              bottom: 0,
              color: 'white',
              fontSize: '0.875rem',
              marginBottom: '0.5rem',
              marginRight: '1rem',
              paddingBottom: '0.125rem',
              paddingLeft: '0.5rem',
              paddingRight: '0.5rem',
              paddingTop: '0.125rem',
              position: 'absolute',
              right: 0,
            }}
          >
            {new URL(baseUrl).host}
          </div>
          <input name="action" type="hidden" value={frame.postUrl} />
        </div>

        {Boolean(frame.input || frame.buttons?.length) && (
          <div
            style={{
              borderBottomLeftRadius: '0.5rem',
              borderBottomRightRadius: '0.5rem',
              borderTopWidth: '0 !important',
              borderWidth: '1px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              paddingBottom: '0.5rem',
              paddingLeft: '1rem',
              paddingRight: '1rem',
              paddingTop: '0.5rem',
            }}
          >
            {frame.input && (
              <input
                aria-label={frame.input.text}
                name="inputText"
                placeholder={frame.input.text}
                style={{
                  borderRadius: '0.25rem',
                  borderWidth: '1px',
                  fontSize: '0.875rem',
                  lineHeight: '1.25rem',
                  paddingBottom: '9px',
                  paddingLeft: '12px',
                  paddingRight: '12px',
                  paddingTop: '10px',
                  width: '100%',
                }}
              />
            )}
            {frame.buttons && (
              <div
                style={{
                  display: 'grid',
                  gap: '10px',
                  gridTemplateColumns: `repeat(${frame.buttons.length}, minmax(0,1fr))`,
                }}
              >
                {frame.buttons.map((button) => (
                  <button
                    key={button.index}
                    name="buttonIndex"
                    style={{
                      alignItems: 'center',
                      borderRadius: '0.5rem',
                      borderWidth: '1px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'row',
                      fontSize: '0.875rem',
                      gap: '3px',
                      height: '2.5rem',
                      justifyContent: 'center',
                      paddingBottom: '0.5rem',
                      paddingLeft: '1rem',
                      paddingRight: '1rem',
                      paddingTop: '0.5rem',
                    }}
                    type="submit"
                    value={button.index}
                  >
                    <span>{button.title}</span>

                    {button.type === 'post_redirect' && (
                      <svg
                        aria-hidden="true"
                        fill="none"
                        height="13"
                        viewBox="0 0 15 15"
                        width="13"
                      >
                        <path
                          fill-rule="evenodd"
                          clip-rule="evenodd"
                          d="M12 13C12.5523 13 13 12.5523 13 12V3C13 2.44771 12.5523 2 12 2H3C2.44771 2 2 2.44771 2 3V6.5C2 6.77614 2.22386 7 2.5 7C2.77614 7 3 6.77614 3 6.5V3H12V12H8.5C8.22386 12 8 12.2239 8 12.5C8 12.7761 8.22386 13 8.5 13H12ZM9 6.5C9 6.5001 9 6.50021 9 6.50031V6.50035V9.5C9 9.77614 8.77614 10 8.5 10C8.22386 10 8 9.77614 8 9.5V7.70711L2.85355 12.8536C2.65829 13.0488 2.34171 13.0488 2.14645 12.8536C1.95118 12.6583 1.95118 12.3417 2.14645 12.1464L7.29289 7H5.5C5.22386 7 5 6.77614 5 6.5C5 6.22386 5.22386 6 5.5 6H8.5C8.56779 6 8.63244 6.01349 8.69139 6.03794C8.74949 6.06198 8.80398 6.09744 8.85143 6.14433C8.94251 6.23434 8.9992 6.35909 8.99999 6.49708L8.99999 6.49738"
                          fill="currentColor"
                        />
                      </svg>
                    )}
                    {button.type === 'link' && (
                      <svg
                        aria-hidden="true"
                        fill="none"
                        height="13"
                        viewBox="0 0 15 15"
                        width="13"
                      >
                        <path
                          d="M3 2C2.44772 2 2 2.44772 2 3V12C2 12.5523 2.44772 13 3 13H12C12.5523 13 13 12.5523 13 12V8.5C13 8.22386 12.7761 8 12.5 8C12.2239 8 12 8.22386 12 8.5V12H3V3L6.5 3C6.77614 3 7 2.77614 7 2.5C7 2.22386 6.77614 2 6.5 2H3ZM12.8536 2.14645C12.9015 2.19439 12.9377 2.24964 12.9621 2.30861C12.9861 2.36669 12.9996 2.4303 13 2.497L13 2.5V2.50049V5.5C13 5.77614 12.7761 6 12.5 6C12.2239 6 12 5.77614 12 5.5V3.70711L6.85355 8.85355C6.65829 9.04882 6.34171 9.04882 6.14645 8.85355C5.95118 8.65829 5.95118 8.34171 6.14645 8.14645L11.2929 3H9.5C9.22386 3 9 2.77614 9 2.5C9 2.22386 9.22386 2 9.5 2H12.4999H12.5C12.5678 2 12.6324 2.01349 12.6914 2.03794C12.7504 2.06234 12.8056 2.09851 12.8536 2.14645Z"
                          fill="currentColor"
                          fill-rule="evenodd"
                          clip-rule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  )
}

type DevtoolsProps = {
  frame: Frame
}

async function Devtools({ frame }: DevtoolsProps) {
  const {
    debug: {
      buttons: _b,
      imageAspectRatio: _ia,
      imageUrl: _iu,
      input: _in,
      postUrl: _pu,
      version: _v,
      htmlTags,
      ...debug
    } = {},
    title: _t,
    ...rest
  } = frame
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <pre style={{ fontFamily: 'monospace' }}>
        {JSON.stringify(rest, null, 2)}
      </pre>

      {htmlTags && (
        <pre style={{ fontFamily: 'monospace' }}>
          {htmlTags.map((x) => (
            <code style={{ display: 'grid' }}>{x}</code>
          ))}
        </pre>
      )}

      {debug && (
        <pre style={{ fontFamily: 'monospace' }}>
          {JSON.stringify(debug, null, 2)}
        </pre>
      )}
    </div>
  )
}

////////////////////////////////////////////////////////////////////////
// Utilities
////////////////////////////////////////////////////////////////////////

type Counter = { button: number }

async function getFrameContext(ctx: Context): Promise<FrameContext> {
  const { req } = ctx
  const { trustedData, untrustedData } =
    (await req.json().catch(() => {})) || {}
  return {
    status: req.method === 'POST' ? 'response' : 'initial',
    trustedData,
    untrustedData,
    url: toBaseUrl(req.url),
  }
}

function parseIntents(intents_: Intents) {
  const intents = intents_ as unknown as JSXNode
  const counter: Counter = {
    button: 1,
  }

  if (Array.isArray(intents))
    return intents.map((e) => parseIntent(e as JSXNode, counter))
  if (typeof intents.children[0] === 'object')
    return Object.assign(intents, {
      children: intents.children.map((e) => parseIntent(e as JSXNode, counter)),
    })
  return parseIntent(intents, counter)
}

function parseIntent(node_: JSXNode, counter: Counter) {
  // Check if the node is a "falsy" node (ie. `null`, `undefined`, `false`, etc).
  const node = (!node_ ? { tag() {} } : node_) as JSXNode

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
  const buttonMap = new Map<number, Omit<FrameButton, 'type'>>()
  const buttonActionMap = new Map<number, FrameButton['type']>()
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
    const type = matchArray[2] as FrameButton['type'] | undefined

    const content = metaTag.getAttribute('content') ?? ''
    if (type) buttonActionMap.set(index, content as FrameButton['type'])
    else {
      if (currentButtonIndex >= index) buttonsAreOutOfOrder = true
      if (currentButtonIndex + 1 === index) currentButtonIndex = index
      else buttonsAreMissing = true

      if (buttonsAreOutOfOrder || buttonsAreMissing) invalidButtons.push(index)

      const title = content ?? index
      buttonMap.set(index, { index, title })
    }
  }

  // TODO: Validate `fc:frame:button:$idx:action="link"` has corresponding `fc:frame:button:$idx:target`
  const buttons = [] as FrameButton[]
  for (const [index, button] of buttonMap) {
    const type = buttonActionMap.get(index) ?? 'post'
    buttons.push({ ...button, type })
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
  }
  // TODO: `invalidButtons`
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

function getGlobalStyles() {
  return `
    :root {
      --bg: #181818;
      --bn: #262626;
      --br: #404040;
      --fg: rgba(255, 255, 255, 0.87);
    }

    @media (prefers-color-scheme: light) {
      :root {
        --bg: #f8f8f8;
        --bn: #F5F5F5;
        --br: #A3A3A3;
        --fg: #181818;
      }
    }

    *,
    ::before,
    ::after {
      box-sizing: border-box;
      border-width: 0;
      border-style: solid;
      border-color: var(--br);
    }

    html {
      background-color: var(--bg);
      color-scheme: light dark;
      color: var(--fg);
      font-family: sans-serif;
      font-synthesis: none;
      font-weight: 400;
      line-height: 1.5;
      text-rendering: optimizeLegibility;

      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      -webkit-text-size-adjust: 100%;
    }

    body {
      margin: 0;
      line-height: inherit;
    }
    
    button {
      background: var(--bn);
    }

    input {
      background: var(--bg);
    }

    pre {
      margin: 0;
    }

    /** Reset **/

    button,
    input {
      font-family: inherit; 
      font-feature-settings: inherit;
      font-variation-settings: inherit;
      font-size: 100%;
      font-weight: inherit;
      line-height: inherit;
      color: inherit;
      margin: 0;
      padding: 0;
    }

    button,
    input {
      font-family: inherit;
      font-feature-settings: inherit;
      font-variation-settings: inherit;
      font-size: 100%;
      font-weight: inherit;
      line-height: inherit;
      color: inherit;
      margin: 0;
      padding: 0;
    }

    button {
      cursor: pointer;
      text-transform: none;
    }

    button[type='submit'] {
      -webkit-appearance: button;
      background-color: transparent;
      background-image: none;
    }

    :-moz-focusring {
      outline: auto;
    }

    input::placeholder {
      opacity: 1;
      color: #9ca3af;
    }

    :disabled {
      cursor: default;
    }

    img,
    svg,
    video {
      display: block;
      vertical-align: middle;
    }

    img,
    video {
      max-width: 100%;
      height: auto;
    }

    [hidden] {
      display: none;
    }
  `
}
