import { bytesToHex, bytesToString, hexToBytes } from 'viem'
import {
  type FrameActionBody,
  Message,
} from '../protobufs/generated/message_pb.js'
import type { FrameData, TrustedData } from '../types/frame.js'
import type { Hub } from '../types/hub.js'

export type VerifyFrameParameters = {
  frameUrl: string
  hub: Hub
  trustedData: TrustedData
  url: string
  verifyOrigin?: boolean
}

export type VerifyFrameReturnType = {
  frameData: FrameData
}

export async function verifyFrame({
  frameUrl,
  hub,
  trustedData,
  url,
  verifyOrigin = true,
}: VerifyFrameParameters): Promise<VerifyFrameReturnType> {
  const body = hexToBytes(`0x${trustedData.messageBytes}`)

  const response = hub.verifyFrame
    ? await hub.verifyFrame({ trustedData })
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
  const frameData = messageToFrameData(message)
  return { frameData }
}

////////////////////////////////////////////////////////////////////
// Utilties

export function messageToFrameData(message: Message): FrameData {
  const frameActionBody = message.data?.body.value as FrameActionBody
  const frameData: FrameData = {
    address: frameActionBody.address
      ? bytesToHex(frameActionBody.address)
      : undefined,
    castId: {
      fid: Number(frameActionBody.castId?.fid),
      hash: bytesToHex(frameActionBody.castId?.hash!),
    },
    fid: Number(message.data?.fid!),
    messageHash: bytesToHex(message.hash),
    network: message.data?.network!,
    timestamp: message.data?.timestamp!,
    url: bytesToString(frameActionBody.url),
    buttonIndex: frameActionBody.buttonIndex as any,
    inputText: bytesToString(frameActionBody.inputText),
    state: bytesToString(frameActionBody.state),
    transactionId: frameActionBody.transactionId
      ? bytesToHex(frameActionBody.transactionId)
      : undefined,
  }

  return frameData
}
