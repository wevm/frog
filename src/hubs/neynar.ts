import { hexToBytes } from 'viem'
import { Message } from '../protobufs/generated/message_pb.js'
import {
  type VerifyFrameParameters,
  messageToFrameData,
} from '../utils/verifyFrame.js'
import { createHub } from './utils.js'

export type NeynarHubParameters = {
  apiKey: string
}

export const neynar = createHub((parameters: NeynarHubParameters) => {
  const { apiKey } = parameters

  const verifyFrame = async ({
    frameUrl,
    trustedData,
    url,
  }: VerifyFrameParameters) => {
    const bytes = hexToBytes(`0x${trustedData.messageBytes}`)
    const response = await fetch(
      'https://api.neynar.com/v2/farcaster/frame/validate',
      {
        method: 'POST',
        headers: {
          accept: 'application json',
          api_key: apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          message_bytes_in_hex: `0x${trustedData.messageBytes}`,
        }),
      },
    ).then(async (res) => res.json())

    if (!response.valid)
      throw new Error(`message is invalid. ${response.message}`)

    if (new URL(url).origin !== new URL(frameUrl).origin)
      throw new Error(`Invalid frame url: ${frameUrl}. Expected: ${url}.`)

    const message = Message.fromBinary(bytes)
    const frameData = messageToFrameData(message)
    return { frameData }
  }

  return {
    apiUrl: 'https://hub-api.neynar.com',
    fetchOptions: {
      headers: {
        api_key: apiKey,
      },
    },
    verifyFrame,
  }
})
