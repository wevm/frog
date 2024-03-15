import { createStore } from 'zustand/vanilla'

import { Data, User } from '../types/frog'

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

const initialState = {
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

export const store = createStore<State>(() => initialState)
