import {
  type FrameContext,
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
    validations: readonly {
      property: string
      value: string
      status: 'valid' | 'invalid'
      message?: string | undefined
    }[]
  }
>

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

export type FrogMetaTagPropertyName = 'frog:context' | 'frog:prev_context'

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
