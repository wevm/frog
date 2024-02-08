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

import {
  type Frame,
  type FrameButton,
  type FrameMetaTagPropertyName,
  type FrameVersion,
  type TrustedData,
  type UntrustedData,
} from './types.js'

type FrameContext = {
  trustedData?: TrustedData
  untrustedData?: UntrustedData
  url: Context['req']['url']
}

type FrameReturnType = {
  image: JSX.Element
  intents: JSX.Element
}

const previewRenderer = jsxRenderer(
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
)

const frameRenderer = jsxRenderer(
  ({ context, intents }) => {
    const serializedContext = encodeURIComponent(JSON.stringify(context))
    return (
      <html lang="en">
        <head>
          <meta property="fc:frame" content="vNext" />
          <meta
            property="fc:frame:image"
            content={`${parseUrl(
              context.url,
            )}/image?context=${serializedContext}`}
          />
          <meta
            property="og:image"
            content={`${parseUrl(
              context.url,
            )}/image?context=${serializedContext}`}
          />
          <meta property="fc:frame:post_url" content={context.url} />
          {parseIntents(intents)}
        </head>
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
    // Frame Routes
    this.use(frameRenderer)
      .get(async (c) => {
        const context = await getFrameContext(c)
        const { intents } = await handler(context)
        return c.render(null, { context, intents })
      })
      .post(async (c) => {
        const context = await getFrameContext(c)
        const { intents } = await handler(context)
        return c.render(null, { context, intents })
      })

    // OG Image Route
    this.get('image', async (c) => {
      const { context } = c.req.query()
      const parsedContext = JSON.parse(
        decodeURIComponent(context),
      ) as FrameContext
      const { image } = await handler(parsedContext)
      return new ImageResponse(image)
    })

    // Frame Preview Routes
    this.use('preview', previewRenderer)
      .get(async (c) => {
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
      .post(async (c) => {
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
        const response = await fetch(baseUrl, {
          method: 'POST',
          body: JSON.stringify({
            untrustedData: {
              buttonIndex,
              castId: {
                fid: castId.fid,
                hash: `0x${bytesToHex(castId.hash)}`,
              },
              fid,
              inputText,
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

        return c.render(
          <>
            <FramePreview baseUrl={baseUrl} frame={frame} />
          </>,
        )
      })

    // Package up the above routes into `path`.
    this.route(path, this)
  }
}

////////////////////////////////////////////////////////////////////////
// Components
////////////////////////////////////////////////////////////////////////

export type ButtonProps = {
  children: string
}

// TODO: `fc:frame:button:$idx:action` and `fc:frame:button:$idx:target`
export function Button({ children }: ButtonProps) {
  return <meta property="fc:frame:button" content={children} />
}

type FramePreviewProps = {
  baseUrl: string
  frame: Frame
}

function FramePreview({ baseUrl, frame }: FramePreviewProps) {
  return (
    <div style={{ maxWidth: '512px', width: '100%' }}>
      <form
        action="/preview"
        method="post"
        style={{
          borderRadius: '0.5rem',
          display: 'flex-column',
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
              aspectRatio: '1.91 / 1',
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
        {/* TODO: Text input */}
        {frame.buttons && (
          <div
            style={{
              borderBottomLeftRadius: '0.5rem',
              borderBottomRightRadius: '0.5rem',
              borderTopWidth: '0 !important',
              borderWidth: '1px',
              display: 'grid',
              gap: '10px',
              gridTemplateColumns: `repeat(${frame.buttons.length}, minmax(0,1fr))`,
              paddingBottom: '0.5rem',
              paddingLeft: '1rem',
              paddingRight: '1rem',
              paddingTop: '0.5rem',
            }}
          >
            {frame.buttons.map((button) => (
              <button
                key={button.index}
                name="buttonIndex"
                style={{
                  borderRadius: '0.5rem',
                  borderWidth: '1px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  height: '2.5rem',
                  paddingBottom: '0.5rem',
                  paddingLeft: '1rem',
                  paddingRight: '1rem',
                  paddingTop: '0.5rem',
                }}
                type="submit"
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

////////////////////////////////////////////////////////////////////////
// Utilities
////////////////////////////////////////////////////////////////////////

type Counter = { button: number }

async function getFrameContext(ctx: Context): Promise<FrameContext> {
  const { req } = ctx
  const { trustedData, untrustedData } =
    (await req.json().catch(() => {})) || {}
  return { trustedData, untrustedData, url: req.url }
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

function parseUrl(path: string) {
  return path.endsWith('/') ? path.slice(0, -1) : path
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

  // TODO: Validate `fc:frame:button:$idx:action="link"` has corresponding `fc:frame:button:$idx:target`
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
