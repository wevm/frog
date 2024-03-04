import { createHub } from './utils.js'

export type NeynarHubParameters = {
  apiKey?: string
}

export const neynar = createHub((parameters: NeynarHubParameters = {}) => {
  const { apiKey = 'NEYNAR_FROG_FM' } = parameters
  return {
    apiUrl: 'https://hub-api.neynar.com',
    fetchOptions: {
      headers: {
        api_key: apiKey,
      },
    },
  }
})
