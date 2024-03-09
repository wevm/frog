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
  debug?:
    | {
        htmlTags: readonly string[]
        state?: string | undefined
      }
    | undefined
  imageAspectRatio: FrameImageAspectRatio
  image: string
  imageUrl: string
  input?: { text: string } | undefined
  postUrl: string
  state: string
  title: string
  version: FrameVersion
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
