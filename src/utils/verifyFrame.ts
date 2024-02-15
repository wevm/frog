import { Message } from '@farcaster/core'
import { hexToBytes } from '@noble/curves/abstract/utils'
import type { TrustedData } from '../types.js'

export type VerifyFrameParameters = {
  fetchOptions?: RequestInit
  hubApiUrl: string
  trustedData: TrustedData
  url: string
}

export async function verifyFrame({
  fetchOptions,
  hubApiUrl,
  trustedData,
  url,
}: VerifyFrameParameters): Promise<Message> {
  const body = hexToBytes(trustedData.messageBytes)
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

  const message = Message.fromJSON(response.message)

  const urlBytes = message?.data?.frameActionBody?.url
  const frameUrl = urlBytes ? new TextDecoder().decode(urlBytes) : undefined
  if (!frameUrl?.startsWith(url))
    throw new Error(`Invalid frame url: ${frameUrl}`)

  return message
}
