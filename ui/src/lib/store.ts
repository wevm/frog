import { createStore } from 'zustand/vanilla'

import { Data } from '../types/frog'

type State = {
  dataKey: string
  dataMap: Record<string, Data>
  inputText: string
  logIndex: number
  logs: string[]
  routes: string[]
  stackIndex: number
  stack: string[]
}

const initialState = {
  dataKey: '',
  dataMap: {},
  inputText: '',
  logIndex: -1,
  logs: [],
  routes: [],
  stackIndex: 0,
  stack: [],
} satisfies State

export const store = createStore<State>(() => initialState)
