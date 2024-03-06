import { createHub } from './utils.js'

export const pinata = createHub(() => {
  return {
    apiUrl: 'https://hub.pinata.cloud',
  }
})
