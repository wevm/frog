import { createContext } from 'hono/jsx'

import { type BaseData, type InitialData } from '../types.js'

export type Value = {
  data: BaseData & InitialData
  routes: readonly string[]
}

export const Context = createContext<Value>({} as Value)

export const valueKey = '__FROG_DATA__'
