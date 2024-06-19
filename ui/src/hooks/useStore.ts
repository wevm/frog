import { useStore as zustand_useStore } from 'zustand'

import { store } from '../lib/store'
import type { Data } from '../types/frog'

export function useStore<slice>(
  selector: (state: ExtractState<typeof store>) => slice,
): slice {
  return zustand_useStore(store, selector)
}

export function useData(): Data | undefined {
  return useStore((state) => state.dataMap[state.dataKey])
}

export function useDataKey(): string | undefined {
  return useStore((state) => state.dataKey)
}

export function useFrame(): Data['frame'] | undefined {
  return useStore((state) => state.dataMap[state.dataKey]?.frame)
}

export function useFrameUrl(): string | undefined {
  return useStore((state) => {
    const data = state.dataMap[state.dataKey]
    if (!data) return
    if (data.type === 'action' || data.type === 'initial') return data.url
    return state.dataMap[data.sourceFrameId].url
  })
}

export function useNotification() {
  return useStore((state) => state.notification)
}

type ExtractState<store> = store extends {
  getState: () => infer state
}
  ? state
  : never
