import { createContext, type PropsWithChildren } from 'hono/jsx'
import { useEffect, useState } from 'hono/jsx/dom'
import LZString from 'lz-string'

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
  routes: readonly string[]
  stackIndex: number
  stack: string[]
  tab: 'context' | 'meta-tags' | 'request' | 'state'
  user?: User | null | undefined
}

const defaultState = {
  inputText: '',
  logIndex: -1,
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
  postFrameTransaction(
    body: RequestBody,
    options?: { skipLogs?: boolean },
  ): Promise<Data>

  fetchAuthCode(): Promise<{ token: string; url: string }>
  fetchAuthStatus(token: string): Promise<User>
  logout(): Promise<{ success: true }>

  setState: ReturnType<typeof useState<State>>[1]
  setMounted(value: boolean): void
}

export const DispatchContext = createContext<DispatchValue>({} as DispatchValue)

export type Props = PropsWithChildren<{
  data: BaseData & InitialData
  routes: readonly string[]
  user?: User | null | undefined
}>

let mounted = false

export function Provider(props: Props) {
  const { children, data: initialData, routes, user } = props
  const { id: initialDataKey } = initialData

  const [state, setState] = useState<State>(() => {
    // restore state on client
    if (typeof window !== 'undefined') {
      const state = location.hash.replace('#state/', '').trim()
      try {
        let restored = LZString.decompressFromEncodedURIComponent(state)
        // Fallback incase there is an extra level of decoding:
        // https://gitter.im/Microsoft/TypeScript?at=5dc478ab9c39821509ff189a
        if (!restored)
          restored = LZString.decompressFromEncodedURIComponent(
            decodeURIComponent(state),
          )

        const parsed = JSON.parse(restored)
        const logIndex =
          parsed.logIndex === (parsed.logs?.length ?? 0) - 1
            ? -1
            : parsed.logIndex

        return {
          ...defaultState,
          ...parsed,
          logIndex,
          user,
        }
      } catch (error) {
        console.log('failed to restore state:', (error as Error).message)
        history.replaceState(null, '', location.pathname)
      }
    }

    return {
      ...defaultState,
      dataKey: initialDataKey,
      dataMap: { [initialDataKey]: props.data },
      logs: [initialDataKey],
      overrides: user?.userFid
        ? { ...defaultState.overrides, userFid: user.userFid }
        : defaultState.overrides,
      routes,
      stack: [initialDataKey],
      user,
    }
  })

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
      const json = await fetch(`${parsePath(url)}/dev/frame`, {
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
      const json = await fetch(`${url}/dev/frame/action`, {
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
      const json = await fetch(`${url}/dev/frame/redirect`, {
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
    async postFrameTransaction(body, _options = { skipLogs: false }) {
      const url = parsePath('body' in data ? data.body.url : data.url)
      const json = await fetch(`${url}/dev/frame/transaction`, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      }).then((response) => response.json())

      // setState((x) => {
      //   const previousData = x.dataMap[x.logs.at(-1) ?? x.dataKey]
      //   const data = {
      //     context: previousData.context,
      //     frame: previousData.frame,
      //     ...json,
      //   }
      //   const id = json.id
      //
      //   return {
      //     ...x,
      //     dataMap: { ...x.dataMap, [id]: data },
      //     logIndex: -1,
      //     logs: options.skipLogs ? x.logs : [...x.logs, id],
      //     routes,
      //   }
      // })

      return json
    },

    async fetchAuthCode() {
      const url = parsePath('body' in data ? data.body.url : data.url)
      const json = await fetch(`${url}/dev/frame/auth/code`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }).then((response) => response.json())
      return json
    },
    async fetchAuthStatus(token) {
      const url = parsePath('body' in data ? data.body.url : data.url)
      const json = await fetch(`${url}/dev/frame/auth/status/${token}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }).then((response) => response.json())
      return json
    },
    async logout() {
      const url = parsePath('body' in data ? data.body.url : data.url)
      const json = await fetch(`${url}/dev/frame/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).then((response) => response.json())
      setState((x) => ({ ...x, user: null }))
      return json
    },

    setState,
    setMounted(value) {
      mounted = value
    },
  } satisfies DispatchValue

  useEffect(() => {
    // Refetch current frame if no other frame is selected or back in the stack (e.g. hit back button to previous frame in history)
    // This allows you to make changes to the frame in code and see updates immediately
    ;(async () => {
      try {
        mounted = false

        const hasHashState = Boolean(
          location.hash.replace('#state/', '').trim(),
        )
        if (!hasHashState) return

        const endOfStack = state.stackIndex === state.stack.length - 1
        const endOfLogs =
          state.logIndex === -1 || state.logIndex === state.logs.length - 1
        const nextData = state.dataMap[state.dataKey]

        if (endOfStack && endOfLogs && nextData) {
          let json: Data
          if (nextData.type === 'initial')
            json = await dispatchValue.getFrame(nextData.url, {
              skipLogs: true,
            })
          else if (nextData.type === 'action')
            json = await dispatchValue.postFrameAction(nextData.body, {
              skipLogs: true,
            })
          else
            json = await dispatchValue.postFrameRedirect(nextData.body, {
              skipLogs: true,
            })

          setState((x) => ({
            ...x,
            logs: x.logs.slice(0, x.logs.length - 1).concat(json.id),
            dataKey: json.id,
          }))

          setTimeout(() => {
            mounted = true
          }, 100)
        }
      } catch (error) {}
    })()
  }, [])

  // save partial state
  useEffect(() => {
    if (!mounted) return
    const compressed = LZString.compressToEncodedURIComponent(
      JSON.stringify({
        dataKey: state.dataKey,
        dataMap: state.dataMap,
        logs: state.logs,
        logIndex: state.logIndex,
        overrides: state.overrides,
        stackIndex: state.stackIndex,
        stack: state.stack,
        tab: state.tab,
      }),
    )
    window.history.replaceState(null, '', `#state/${compressed}`)
  }, [
    state.dataKey,
    state.dataMap,
    state.logs,
    state.logIndex,
    state.overrides,
    state.stackIndex,
    state.stack,
    state.tab,
  ])

  return (
    <StateContext.Provider value={stateValue}>
      <DispatchContext.Provider value={dispatchValue}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  )
}
