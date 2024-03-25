import { mnemonicToAccount } from 'viem/accounts'

import type { Hub } from '../../types/hub.js'

export async function getSignedKeyRequest(data: {
  appFid: number | undefined
  appMnemonic: string | undefined
  publicKey: `0x${string}`
}) {
  const { appFid, appMnemonic, publicKey } = data
  if (appFid && appMnemonic) {
    const account = mnemonicToAccount(appMnemonic)

    const deadline = Math.floor(Date.now() / 1000) + 60 * 60 // now + hour
    const requestFid = appFid
    const signature = await account.signTypedData({
      domain: {
        name: 'Farcaster SignedKeyRequestValidator',
        version: '1',
        chainId: 10,
        verifyingContract: '0x00000000FC700472606ED4fA22623Acf62c60553',
      },
      types: {
        SignedKeyRequest: [
          { name: 'requestFid', type: 'uint256' },
          { name: 'key', type: 'bytes' },
          { name: 'deadline', type: 'uint256' },
        ],
      },
      primaryType: 'SignedKeyRequest',
      message: {
        requestFid: BigInt(appFid),
        key: publicKey,
        deadline: BigInt(deadline),
      },
    })

    return { deadline, requestFid, signature }
  }

  return (await fetch(
    `https://auth.frog.fm/api/signed-key-requests/${publicKey}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    },
  ).then((response) => response.json())) as {
    deadline: number
    requestFid: number
    signature: string
  }
}

export async function postSignedKeyRequest(body: {
  deadline: number
  publicKey: string
  requestFid: number
  signature: string
}) {
  return (await fetch('https://api.warpcast.com/v2/signed-key-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...body,
      key: body.publicKey,
    }),
  }).then((response) => response.json())) as SignedKeyRequestResponse
}

export async function getSignedKeyRequestForToken(token: string) {
  return (await fetch(
    `https://api.warpcast.com/v2/signed-key-request?token=${token}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    },
  ).then((response) => response.json())) as SignedKeyRequestResponse
}

type SignedKeyRequestResponse = {
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

export async function getUserDataByFid(hub: Hub, userFid: number) {
  const response = (await fetch(
    `${hub.apiUrl}/v1/userDataByFid?fid=${userFid}`,
    {
      ...hub.fetchOptions,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...hub.fetchOptions?.headers,
      },
    },
  ).then((response) => response.json())) as {
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

  let displayName = undefined
  let pfp = undefined
  let username = undefined

  for (const message of response.messages) {
    if (message.data.type !== 'MESSAGE_TYPE_USER_DATA_ADD') continue

    const type = message.data.userDataBody.type
    const value = message.data.userDataBody.value
    if (type === 'USER_DATA_TYPE_PFP') pfp = value
    if (type === 'USER_DATA_TYPE_USERNAME') username = value
    if (type === 'USER_DATA_TYPE_DISPLAY') displayName = value
  }

  return { displayName, pfp, userFid, username }
}
