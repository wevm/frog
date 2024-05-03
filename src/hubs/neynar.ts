import type { TrustedData } from '../types/frame.js'
import { createHub } from './utils.js'

export type NeynarHubParameters = {
  apiKey: string
}

export const neynar = createHub((parameters: NeynarHubParameters) => {
  const { apiKey } = parameters

  return {
    apiUrl: 'https://hub-api.neynar.com',
    fetchOptions: {
      headers: {
        api_key: apiKey,
      },
    },
    verifyFrame: async ({ trustedData }: { trustedData: TrustedData }) => {
      return await fetch('https://api.neynar.com/v2/farcaster/frame/validate', {
        method: 'POST',
        headers: {
          accept: 'application json',
          api_key: apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          message_bytes_in_hex: `0x${trustedData.messageBytes}`,
        }),
      }).then(async (res) => res.json())
    },
  }
})
