import { bytesToHex, bytesToString, hexToBytes } from 'viem'
import { FrameActionBody, Message } from '../protobufs/generated/message_pb.js'
import { type FrameData, type TrustedData } from '../types/frame.js'
import { parsePath } from './parsePath.js'

export type VerifyFrameParameters = {
  fetchOptions?: RequestInit
  frameUrl: string
  hubApiUrl: string
  trustedData: TrustedData
  url: string
}

export type VerifyFrameReturnType = {
  frameData: FrameData
}

export async function verifyFrame({
  fetchOptions,
  frameUrl,
  hubApiUrl,
  trustedData,
  url,
}: VerifyFrameParameters): Promise<VerifyFrameReturnType> {
  const body = hexToBytes(`0x${trustedData.messageBytes}`)
  const response = await fetch(`${hubApiUrl}/v1/validateMessage`, {
    ...fetchOptions,
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      ...fetchOptions?.headers,
    },
    body,
  }).then((res) => res.json())

  if (!response.valid)
    throw new Error(`message is invalid. ${response.details}`)

  if (!parsePath(frameUrl)?.startsWith(parsePath(url)))
    throw new Error(`Invalid frame url: ${frameUrl}. Expected: ${url}.`)

  const message = Message.fromBinary(body)
  const frameData = messageToFrameData(message)
  return { frameData }
}

////////////////////////////////////////////////////////////////////
// Utilties

function messageToFrameData(message: Message): FrameData {
  const frameActionBody = message.data?.body.value as FrameActionBody
  const frameData: FrameData = {
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
  }

  return frameData
}
