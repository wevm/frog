import { hexToBytes } from '@noble/curves/abstract/utils'
import type { TrustedData } from '../types.js'

export type VerifyFrameParameters = {
  fetchOptions?: RequestInit
  frameUrl: string
  hubApiUrl: string
  trustedData: TrustedData
  url: string
}

export async function verifyFrame({
  fetchOptions,
  frameUrl,
  hubApiUrl,
  trustedData,
  url,
}: VerifyFrameParameters): Promise<void> {
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

  if (!frameUrl?.startsWith(url))
    throw new Error(`Invalid frame url: ${frameUrl}. Expected: ${url}.`)
}
