import { useContext, useState } from 'hono/jsx'

import { toSearchParams } from '../../utils/toSearchParams.js'
import { Context } from '../lib/context.js'
import { type Data } from '../types.js'

type Store = {
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
  stackIndex: number
  stack: string[]
  tab: 'context' | 'meta-tags' | 'request' | 'state'
}

const defaultStore = {
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
} satisfies Omit<Store, 'dataKey' | 'dataMap' | 'logs' | 'stack'>

export function useStore() {
  const value = useContext(Context)
  const [store, setStore] = useState<Store>({
    ...defaultStore,
    dataKey: value.data.id,
    dataMap: { [value.data.id]: value.data },
    logs: [value.data.id],
    stack: [value.data.id],
  })

  const data = store.dataMap[store.dataKey]
  const contextString = toSearchParams(data.context).toString()
  const frame = {
    ...data.frame,
    image: data.frame.image.replace('_frog_image', contextString),
    imageUrl: data.frame.imageUrl.replace('_frog_imageUrl', contextString),
  }

  return { ...store, data, frame, setStore } as const
}
