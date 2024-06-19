import type { FrameContext } from '../types/context.js'
import type { FrameImageAspectRatio, FrameVersion } from '../types/frame.js'

export type RequestBody = {
  buttonIndex: number
  castId: { fid: number; hash: string }
  fid?: number | undefined
  inputText?: string | undefined
  state?: string | undefined
}

export type Frame = {
  buttons: readonly FrameButton[] | undefined
  debug:
    | {
        htmlTags: readonly string[]
      }
    | undefined
  imageAspectRatio: FrameImageAspectRatio
  image: string
  imageUrl: string
  input: { text: string } | undefined
  postUrl: string | undefined
  state: string
  title: string
  version: FrameVersion
}

export type FrameButton = {
  index: 1 | 2 | 3 | 4
  title: string
} & (
  | {
      type: 'link'
      postUrl: undefined
      target: `http://${string}` | `https://${string}`
    }
  | {
      type: 'mint'
      postUrl: undefined
      target: `eip155:${string}`
    }
  | {
      type: 'post' | 'post_redirect'
      postUrl: string | undefined
      target: `http://${string}` | `https://${string}` | undefined
    }
  | {
      type: 'tx'
      postUrl: string | undefined
      target: string
    }
)

export type State = {
  context: FrameContext
}
