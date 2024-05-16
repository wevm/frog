import type { MiddlewareHandler } from 'hono'
import { hexToBytes } from 'viem'

import {
  type NeynarHubParameters,
  neynar as neynarHub,
} from '../hubs/neynar.js'
import { Message } from '../protobufs/generated/message_pb.js'
import type { Hub } from '../types/hub.js'
import type { Pretty } from '../types/utils.js'
import { messageToFrameData } from '../utils/verifyFrame.js'

export type NeynarVariables = {
  /**
   * The cast of the frame.
   */
  cast?: Pretty<NeynarCast> | undefined
  /**
   * The user who interacted with the frame.
   */
  interactor?: Pretty<NeynarUser> | undefined
}

export type NeynarMiddlewareParameters = {
  /**
   * Neynar API Key.
   */
  apiKey: string
  /**
   * Set of features to enable and inject into context.
   *
   * - `'interactor'`: Fetches the user who interacted with the frame.
   * - `'cast'`: Fetches the cast of the frame.
   */
  features: ('interactor' | 'cast')[]
}

export function neynar(
  parameters: NeynarMiddlewareParameters,
): MiddlewareHandler<{
  Variables: NeynarVariables
}> {
  const { apiKey, features } = parameters
  return async (c, next) => {
    const { trustedData } = (await c.req.json().catch(() => {})) || {}
    if (!trustedData) return await next()

    // Note: We are not verifying here as we verify downstream (internal Frog handler).
    const body = hexToBytes(`0x${trustedData.messageBytes}`)
    const message = Message.fromBinary(body)
    const frameData = messageToFrameData(message)

    const {
      castId: { fid: castFid, hash },
      fid,
    } = frameData

    const [castResponse, usersResponse] = await Promise.all([
      features.includes('cast')
        ? getCast({
            apiKey,
            hash,
          })
        : Promise.resolve(undefined),
      features.includes('interactor')
        ? getUsers({ apiKey, castFid, fids: [fid] })
        : Promise.resolve(undefined),
    ])

    if (castResponse) c.set('cast', castResponse.cast)
    if (usersResponse) {
      const [user] = usersResponse.users
      if (user) c.set('interactor', user)
    }

    await next()
  }
}

///////////////////////////////////////////////////////////////////////////
// Utilities

const neynarApiUrl = 'https://api.neynar.com'

type GetCastParameters = { apiKey: string; hash: string }
type GetCastReturnType = {
  cast: NeynarCast
}

async function getCast({
  apiKey,
  hash,
}: GetCastParameters): Promise<GetCastReturnType> {
  const response = await fetch(
    `${neynarApiUrl}/v2/farcaster/cast?type=hash&identifier=${hash}`,
    {
      headers: {
        api_key: apiKey,
        'Content-Type': 'application/json',
      },
    },
  ).then((res) => res.json())
  return camelCaseKeys(response) as GetCastReturnType
}

type GetUsersParameters = { apiKey: string; castFid: number; fids: number[] }
type GetUsersReturnType = {
  users: NeynarUser[]
}

async function getUsers({
  apiKey,
  castFid,
  fids,
}: GetUsersParameters): Promise<GetUsersReturnType> {
  const response = await fetch(
    `${neynarApiUrl}/v2/farcaster/user/bulk?fids=${fids.join(
      ',',
    )}&viewer_fid=${castFid}`,
    {
      headers: {
        api_key: apiKey,
        'Content-Type': 'application/json',
      },
    },
  ).then((res) => res.json())
  return camelCaseKeys(response) as GetUsersReturnType
}

function camelCaseKeys(response: object): object {
  if (!response) return response
  if (typeof response !== 'object') return response
  if (Array.isArray(response)) return response.map(camelCaseKeys)
  return Object.fromEntries(
    Object.entries(response).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
      camelCaseKeys(value),
    ]),
  )
}

///////////////////////////////////////////////////////////////////////////
// Types

export type NeynarCast = {
  author: NeynarUser
  embeds: { url: string }[]
  // TODO: populate with real type.
  frames: unknown
  hash: string
  mentionedProfiles: NeynarUser[]
  object: 'cast'
  parentAuthor: { fid: number | null }
  parentHash: string | null
  parentUrl: string
  reactions: {
    likes: { fid: number; fname: string }[]
    recasts: { fid: number; fname: string }[]
  }
  replies: { count: number }
  rootParentUrl: string
  text: string
  threadHash: string
  timestamp: string
}

export type NeynarUser = {
  activeStatus: 'active' | 'inactive'
  custodyAddress: string
  displayName: string
  fid: number
  followerCount: number
  followingCount: number
  object: 'user'
  pfpUrl: string
  profile: {
    bio: {
      text: string
      mentionedProfiles: string[]
    }
  }
  username: string
  verifications: string[]
  verifiedAddresses: {
    ethAddresses: string[]
    solAddresses: string[]
  }
  viewerContext?: {
    following: boolean
    followedBy: boolean
  }
}

///////////////////////////////////////////////////////////////////////////
// Higher-Level API

export type CreateNeynarParameters = {
  apiKey: string
}

export type CreateNeynarReturnType = {
  hub: (parameters?: Pretty<Omit<NeynarHubParameters, 'apiKey'>>) => Hub
  middleware: (
    parameters: Pretty<Omit<NeynarMiddlewareParameters, 'apiKey'>>,
  ) => MiddlewareHandler<{
    Variables: NeynarVariables
  }>
}

export function createNeynar(
  parameters: CreateNeynarParameters,
): CreateNeynarReturnType {
  const { apiKey } = parameters
  return {
    hub(parameters = {}) {
      return neynarHub({ ...parameters, apiKey })
    },
    middleware(parameters) {
      return neynar({ ...parameters, apiKey })
    },
  }
}
