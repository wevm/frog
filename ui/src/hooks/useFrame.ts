import { useStore } from 'zustand'

import { store } from '../lib/store'

export function useFrame() {
  return useStore(store, (state) => state.dataMap[state.dataKey].frame)
}
