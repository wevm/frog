import { createStore } from 'zustand/vanilla'

type State = {
  bears: number
  frames: string[]
}

export const store = createStore<State>(() => ({
  bears: 0,
  frames: [],
}))
