// TODO: TSDoc

import {
  type FrameImageAspectRatio,
  type FrameVersion,
  type Pretty,
} from '../types.js'

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
    stateTooLong: boolean
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

export type FrameMetaTagPropertyName =
  | 'fc:frame'
  | 'fc:frame:image'
  | 'fc:frame:image:aspect_ratio'
  | 'fc:frame:input:text'
  | 'fc:frame:post_url'
  | 'fc:frame:state'
  | 'og:image'
  | 'og:title'
  | `fc:frame:button:${FrameButton['index']}:action`
  | `fc:frame:button:${FrameButton['index']}:target`
  | `fc:frame:button:${FrameButton['index']}`

export type FarcMetaTagPropertyName = 'farc:context' | 'farc:prev_context'
