// TODO: TSDoc

import { type Context } from 'hono'
import { type JSXNode } from 'hono/jsx'

export type FrameContext = {
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

export type PreviousFrameContext = FrameContext & {
  /** Intents from the previous frame. */
  intents: readonly JSXNode[]
}

export type TrustedData = {
  messageBytes: string
}

export type UntrustedData = FrameData

export type FrameData = {
  buttonIndex?: FrameButton['index'] | undefined
  castId: { fid: number; hash: string }
  fid: number
  inputText?: string | undefined
  messageHash: string
  network: number
  timestamp: number
  url: string
}

export type Frame = {
  buttons?: readonly FrameButton[] | undefined
  debug?: FrameDebug | undefined
  imageAspectRatio: FrameImageAspectRatio
  imageUrl: string
  input?: FrameInput | undefined
  postUrl: string
  title: string
  version: FrameVersion
}

export type FrameDebug = Pretty<
  Omit<Frame, 'debug' | 'title'> & {
    buttonsAreOutOfOrder: boolean
    fallbackImageToUrl: boolean
    htmlTags: readonly string[]
    image: string
    imageAspectRatio: FrameImageAspectRatio
    inputTextTooLong: boolean
    invalidButtons: readonly FrameButton['index'][]
    postUrl: string
    postUrlTooLong: boolean
    valid: boolean
  }
>

export type FrameButton = {
  index: 1 | 2 | 3 | 4
  title: string
} & (
  | { type: 'link'; target: `http://${string}` | `https://${string}` }
  | {
      type: 'mint'
      // TODO: tighten type
      target: `eip155:${string}`
    }
  | {
      type: 'post' | 'post_redirect'
      target?: `http://${string}` | `https://${string}` | undefined
    }
)

export type FrameInput = {
  text: string
}

export type FrameImageAspectRatio = '1.91:1' | '1:1'

export type FrameVersion = 'vNext'

export type FrameMetaTagPropertyName =
  | 'fc:frame'
  | 'fc:frame:image'
  | 'fc:frame:image:aspect_ratio'
  | 'fc:frame:input:text'
  | 'fc:frame:post_url'
  | 'og:image'
  | 'og:title'
  | `fc:frame:button:${FrameButton['index']}:action`
  | `fc:frame:button:${FrameButton['index']}:target`
  | `fc:frame:button:${FrameButton['index']}`

export type FarcMetaTagPropertyName = 'farc:context' | 'farc:prev_context'

type Pretty<type> = { [key in keyof type]: type[key] } & unknown
