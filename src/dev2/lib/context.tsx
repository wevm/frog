import { createContext, type PropsWithChildren } from 'hono/jsx'
import { useState } from 'hono/jsx/dom'

import {
  type BaseData,
  type Data,
  type Frame,
  type InitialData,
  type RequestBody,
  type User,
} from '../types.js'
import { toSearchParams } from '../../utils/toSearchParams.js'
import { parsePath } from '../../utils/parsePath.js'

export const dataId = '__FROG_DATA__'

export type State = {
  dataKey: string
  dataMap: Record<string, Data>
  inputText: string
  logIndex: number
  logs: string[]
  overrides: {
    userFid: number
    castFid: number
    castHash: string
  }
  mounted: boolean
  routes: readonly string[]
  stackIndex: number
  stack: string[]
  tab: 'context' | 'meta-tags' | 'request' | 'state'
  user?: User | undefined
}

const defaultState = {
  inputText: '',
  logIndex: -1,
  mounted: false,
  overrides: {
    userFid: 1,
    castFid: 1,
    castHash: '0x0000000000000000000000000000000000000000',
  },
  stackIndex: 0,
  tab: 'request',
} satisfies Omit<State, DynamicStateKeys>
type DynamicStateKeys = 'dataKey' | 'dataMap' | 'logs' | 'routes' | 'stack'

export type StateValue = State & {
  data: Data
  frame: Frame
}

export const StateContext = createContext<StateValue>({} as StateValue)

export type DispatchValue = {
  getFrame(
    url: string,
    options?: { replaceLogs?: boolean; skipLogs?: boolean },
  ): Promise<Data>
  postFrameAction(
    body: RequestBody,
    options?: { skipLogs?: boolean },
  ): Promise<Data>
  postFrameRedirect(
    body: RequestBody,
    options?: { skipLogs?: boolean },
  ): Promise<Data>

  setState: ReturnType<typeof useState<State>>[1]
}

export const DispatchContext = createContext<DispatchValue>({} as DispatchValue)

export type Props = PropsWithChildren<{
  data: BaseData & InitialData
  routes: readonly string[]
}>

export function Provider(props: Props) {
  const { children, data: initialData, routes } = props
  const { id: dataKey } = initialData

  const [state, setState] = useState<State>(() => ({
    ...defaultState,
    dataKey,
    dataMap: { [dataKey]: props.data },
    logs: [dataKey],
    routes,
    stack: [dataKey],
  }))

  const data = state.dataMap[state.dataKey]
  const contextString = toSearchParams(data.context).toString()
  const frame = {
    ...data.frame,
    image: data.frame.image.replace('_frog_image', contextString),
    imageUrl: data.frame.imageUrl.replace('_frog_imageUrl', contextString),
  }

  const stateValue = {
    ...state,
    data,
    frame,
  } satisfies StateValue

  const dispatchValue = {
    async getFrame(
      url: string,
      options = { replaceLogs: false, skipLogs: false },
    ) {
      const json = await fetch(`${parsePath(url)}/dev2/frame`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }).then((response) => response.json())

      const { data, routes } = json
      const id = data.id

      setState((x) => ({
        ...x,
        dataMap: { ...x.dataMap, [id]: data },
        logIndex: -1,
        logs: options.skipLogs
          ? x.logs
          : options.replaceLogs
            ? [id]
            : [...x.logs, id],
        routes,
      }))

      return data
    },
    async postFrameAction(body, options = { skipLogs: false }) {
      const url = parsePath(body.url)
      const json = await fetch(`${url}/dev2/frame/action`, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      }).then((response) => response.json())

      const { data, routes } = json
      const id = data.id

      setState((x) => ({
        ...x,
        dataMap: { ...x.dataMap, [id]: data },
        logIndex: -1,
        logs: options.skipLogs ? x.logs : [...x.logs, id],
        routes,
      }))

      return data
    },
    async postFrameRedirect(body, options = { skipLogs: false }) {
      const url = parsePath(body.url)
      const json = await fetch(`${url}/dev2/frame/redirect`, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      }).then((response) => response.json())

      setState((x) => {
        const previousData = x.dataMap[x.logs.at(-1) ?? x.dataKey]
        const data = {
          context: previousData.context,
          frame: previousData.frame,
          ...json,
        }
        const id = json.id

        return {
          ...x,
          dataMap: { ...x.dataMap, [id]: data },
          logIndex: -1,
          logs: options.skipLogs ? x.logs : [...x.logs, id],
          routes,
        }
      })

      return json
    },

    setState,
  } satisfies DispatchValue

  return (
    <StateContext.Provider value={stateValue}>
      <DispatchContext.Provider value={dispatchValue}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  )
}
