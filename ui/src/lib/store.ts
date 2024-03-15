import lz from 'lz-string'
import { createStore } from 'zustand/vanilla'
import { subscribeWithSelector } from 'zustand/middleware'

import { Bootstrap, Data, User } from '../types/frog'

export type State = {
  dataKey: string
  dataMap: Record<string, Data>
  frameUrls: string[]
  inputText: string
  logIndex: number
  logs: string[]
  overrides: {
    userFid: number
    castFid: number
    castHash: string
  }
  stackIndex: number
  stack: string[]
  user: User | null | undefined
  tab: 'context' | 'meta-tags' | 'request' | 'state'
}

const initialState: State = {
  dataKey: '',
  dataMap: {},
  frameUrls: [],
  inputText: '',
  logIndex: -1,
  logs: [],
  overrides: {
    userFid: 1,
    castFid: 1,
    castHash: '0x0000000000000000000000000000000000000000',
  },
  stackIndex: 0,
  stack: [],
  user: undefined,
  tab: 'request',
} satisfies State

export const store = createStore(subscribeWithSelector(() => initialState))

const hashKey = 'state'

export function hydrateStore(bootstrap: Bootstrap) {
  const { data, frameUrls, user } = bootstrap

  let hydrated: Partial<State> = {
    frameUrls,
    user,
  }
  const restoredState = restoreState()
  if (restoredState) hydrated = { ...hydrated, ...restoredState }
  else if (data)
    hydrated = {
      ...hydrated,
      dataKey: data.id,
      dataMap: { [data.id]: data },
      logs: [data.id],
      stack: [data.id],
      frameUrls,
      user,
    }

  store.setState((state) => ({
    ...state,
    ...hydrated,
    overrides: user
      ? {
          ...state.overrides,
          userFid: user.userFid,
        }
      : state.overrides,
  }))

  watchState()
}

function restoreState() {
  try {
    console.debug('[frog] restoring state...')
    const state = location.hash.replace(`#${hashKey}/`, '').trim()
    let restored = lz.decompressFromEncodedURIComponent(state)
    // Fallback incase there is an extra level of decoding:
    // https://gitter.im/Microsoft/TypeScript?at=5dc478ab9c39821509ff189a
    if (!restored)
      restored = lz.decompressFromEncodedURIComponent(decodeURIComponent(state))

    const parsed = JSON.parse(restored ?? 'null')
    if (!parsed) return undefined

    const logIndex =
      parsed.logIndex === (parsed.logs?.length ?? 0) - 1 ? -1 : parsed.logIndex
    console.debug('[frog] restored state.')
    return { ...parsed, logIndex }
  } catch (error) {
    console.log(`[frog] failed to restore state (${(error as Error).message})`)
    history.replaceState(null, '', location.pathname)
  }
}

function watchState() {
  store.subscribe(
    (state) => ({
      dataKey: state.dataKey,
      dataMap: state.dataMap,
      logs: state.logs,
      logIndex: state.logIndex,
      overrides: state.overrides,
      stack: state.stack,
      stackIndex: state.stackIndex,
      tab: state.tab,
    }),
    (slice) => {
      const compressed = lz.compressToEncodedURIComponent(JSON.stringify(slice))
      window.history.replaceState(null, '', `#${hashKey}/${compressed}`)
    },
  )
}
