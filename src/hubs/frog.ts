import { createHub } from './utils.js'

export const frog = createHub(() => {
  return {
    apiUrl: 'https://api.hub.wevm.dev',
  }
})
