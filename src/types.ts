// TODO: TSDoc

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

type Pretty<type> = { [key in keyof type]: type[key] } & unknown
