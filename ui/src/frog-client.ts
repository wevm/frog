// modified version of `@vite/client`
// https://github.com/vitejs/vite/blob/main/packages/vite/src/client/client.ts
import { HMRPayload } from 'vite/types/hmrPayload.js'

import { client } from './lib/api'
import { store } from './lib/store'

declare const __FROG_CLIENT_ENABLED__: string | undefined

export function initFrogClient() {
  const enabled = (() => {
    try {
      return (
        typeof __FROG_CLIENT_ENABLED__ === 'boolean' &&
        __FROG_CLIENT_ENABLED__ === true
      )
    } catch {
      return false
    }
  })()
  if (!enabled) return

  console.debug('[frog] connecting...')

  const importMetaUrl = new URL(import.meta.url)

  const socketProtocol = importMetaUrl.protocol === 'https:' ? 'wss' : 'ws'
  const socketHost = `${importMetaUrl.hostname}:${importMetaUrl.port}/`

  try {
    setupWebSocket(socketProtocol, socketHost)
  } catch (error) {
    console.error(`[frog] failed to connect to websocket (${error}). `)
  }
}

function setupWebSocket(
  protocol: string,
  hostAndPath: string,
  onCloseWithoutOpen?: () => void,
) {
  const socket = new WebSocket(`${protocol}://${hostAndPath}`, 'vite-hmr')
  let isOpened = false

  socket.addEventListener(
    'open',
    () => {
      isOpened = true
    },
    { once: true },
  )

  // Listen for messages
  socket.addEventListener('message', async ({ data }) => {
    const payload = JSON.parse(data) as HMRPayload
    switch (payload.type) {
      case 'connected':
        console.debug('[frog] connected.')
        break
      case 'error': {
        const err = payload.err
        console.error(
          `[frog] Internal Server Error\n${err.message}\n${err.stack}`,
        )
        break
      }
      case 'update':
      case 'full-reload': {
        client.frames
          .$get()
          .then((res) => res.json())
          .then((routes) => store.setState((state) => ({ ...state, routes })))
          .catch((err) => console.error('error fetching frames', err))
        break
      }
      default:
        console.log('message', payload)
    }
  })

  // ping server
  socket.addEventListener('close', async ({ wasClean }) => {
    if (wasClean) return

    if (!isOpened && onCloseWithoutOpen) {
      onCloseWithoutOpen()
      return
    }

    console.log('[frog] server connection lost. polling for restart...')
    await waitForSuccessfulPing(protocol, hostAndPath)
    location.reload()
  })

  return socket
}

async function waitForSuccessfulPing(
  socketProtocol: string,
  hostAndPath: string,
  ms = 1000,
) {
  const pingHostProtocol = socketProtocol === 'wss' ? 'https' : 'http'

  async function ping() {
    // A fetch on a websocket URL will return a successful promise with status 400,
    // but will reject a networking error.
    // When running on middleware mode, it returns status 426, and an cors error happens if mode is not no-cors
    try {
      await fetch(`${pingHostProtocol}://${hostAndPath}`, {
        mode: 'no-cors',
        headers: {
          // Custom headers won't be included in a request with no-cors so (ab)use one of the
          // safelisted headers to identify the ping request
          Accept: 'text/x-vite-ping',
        },
      })
      return true
    } catch {}
    return false
  }

  if (await ping()) return
  await wait(ms)

  while (true) {
    if (document.visibilityState === 'visible') {
      if (await ping()) break
      await wait(ms)
    } else await waitForWindowShow()
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function waitForWindowShow() {
  return new Promise<void>((resolve) => {
    async function onChange() {
      if (document.visibilityState === 'visible') {
        resolve()
        document.removeEventListener('visibilitychange', onChange)
      }
    }
    document.addEventListener('visibilitychange', onChange)
  })
}
