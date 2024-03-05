import type { FrameContext } from '../types/context.js'
import {
  type FrameImageAspectRatio,
  type FrameVersion,
} from '../types/frame.js'

export type RequestBody = {
  buttonIndex: number
  castId: { fid: number; hash: string }
  fid?: number | undefined
  inputText?: string | undefined
  state?: string | undefined
}

export type Frame = {
  buttons?: readonly FrameButton[] | undefined
  debug?: FrameDebug | undefined
  imageAspectRatio: FrameImageAspectRatio
  image: string
  imageUrl: string
  input?: FrameInput | undefined
  postUrl: string
  state: string
  title: string
  version: FrameVersion
}

export type FrameDebug = {
  buttonsAreOutOfOrder: boolean
  htmlTags: readonly string[]
  invalidButtons: readonly FrameButton['index'][]
  state?: string | undefined
}

export type FrameButton = {
  index: 1 | 2 | 3 | 4
  title: string
} & (
  | { type: 'link'; target: `http://${string}` | `https://${string}` }
  | {
      type: 'mint'
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

export type FrogMetaTagPropertyName =
  | 'frog:context'
  | 'frog:prev_context'
  | 'frog:version'

export type State = {
  context: FrameContext
}

export type SignedKeyRequestResponse = {
  result: { signedKeyRequest: SignedKeyRequest }
}
type SignedKeyRequest = {
  token: string
  deeplinkUrl: string
  key: string
  requestFid: number
  isSponsored: boolean
} & (
  | {
      state: 'pending'
      signerUser: {
        fid: number
        username: string
        displayName: string
        pfp: { url: string; verified: false }
        profile: {
          bio: {
            text: string
            mentions: string[]
            channelMentions: string[]
          }
          location: { placeId: string; description: string }
        }
        followerCount: number
        followingCount: number
        activeOnFcNetwork: boolean
        viewerContext: { following: boolean; followedBy: boolean }
      }
      signerUserMetadata: {
        createdAt: number
        usersCount: number
        viewerContext: { existingKeysCountForViewer: number }
      }
      userFid: undefined
    }
  | {
      state: 'approved' | 'completed'
      signerUser: undefined
      signerUserMetadata: undefined
      userFid: number
    }
)

export type UserDataByFidResponse = {
  messages: {
    data: {
      type: 'MESSAGE_TYPE_USER_DATA_ADD'
      userDataBody: {
        type:
          | 'USER_DATA_TYPE_PFP'
          | 'USER_DATA_TYPE_USERNAME'
          | 'USER_DATA_TYPE_DISPLAY'
        value: string
      }
    }
  }[]
}
