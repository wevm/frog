import { createStore } from 'zustand/vanilla'

type State = {
  refreshCount: number
  frames: string[]
}

export const store = createStore<State>(() => ({
  refreshCount: 0,
  frames: [],
}))
