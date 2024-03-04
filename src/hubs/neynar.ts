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
  }
})
