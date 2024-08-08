import { hexToBytes } from 'viem'
import { Message } from '../protobufs/generated/message_pb.js'
import type { TrustedData } from '../types/frame.js'
import type { Hub } from '../types/hub.js'

export type VerifyMessageParameters = {
  frameUrl: string
  hub: Hub
  trustedData: TrustedData
  url: string
  verifyOrigin?: boolean
}

export type VerifyMessageReturnType = {
  message: Message
}

export async function verifyMessage({
  frameUrl,
  hub,
  trustedData,
  url,
  verifyOrigin = true,
}: VerifyMessageParameters): Promise<VerifyMessageReturnType> {
  const body = hexToBytes(`0x${trustedData.messageBytes}`)

  const response = hub.verifyMessage
    ? await hub.verifyMessage({ trustedData })
    : await fetch(`${hub.apiUrl}/v1/validateMessage`, {
        ...hub.fetchOptions,
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          ...hub.fetchOptions?.headers,
        },
        body,
      }).then((res) => res.json())

  if (!response.valid)
    throw new Error(
      `message is invalid. ${response.details || response.message}`,
    )

  if (verifyOrigin && new URL(url).origin !== new URL(frameUrl).origin)
    throw new Error(`Invalid frame url: ${frameUrl}. Expected: ${url}.`)

  const message = Message.fromBinary(body)
  return { message }
}
