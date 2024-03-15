import { type MouseEvent } from 'react'
import { Data } from '../types/frog.js'
import { client } from '../lib/api.js'
import { store } from '../lib/store.js'

export async function handlePost(button: {
  index: number
  target: string | undefined
}) {
  const { index, target } = button
  const { dataKey, dataMap, inputText, overrides, user } = store.getState()
  const frame = dataMap[dataKey].frame

  const json = await client.frames[':url'].action
    .$post({
      param: { url: encodeURIComponent(target ?? frame.postUrl) },
      json: {
        buttonIndex: index,
        castId: {
          fid: overrides.castFid,
          hash: overrides.castHash,
        },
        fid:
          overrides.userFid !== user?.userFid
            ? overrides.userFid
            : user.userFid,
        inputText,
        state: frame.state,
      },
    })
    .then((response) => response.json())

  const id = json.id
  store.setState((state) => {
    const nextStackIndex = state.stackIndex + 1
    return {
      ...state,
      dataKey: id,
      dataMap: { ...state.dataMap, [id]: json },
      inputText: '',
      logIndex: -1,
      logs: [...state.logs, id],
      stack:
        nextStackIndex < state.stack.length
          ? [...state.stack.slice(0, nextStackIndex), id]
          : [...state.stack, id],
      stackIndex: nextStackIndex,
    }
  })
}

export async function performAction(data: Data, previousData: Data) {
  const url = encodeURIComponent(data.url)

  switch (data.type) {
    case 'initial':
      return await client.frames[':url']
        .$get({ param: { url } })
        .then((response) => response.json())
    case 'action':
      return await client.frames[':url'].action
        .$post({ param: { url }, json: data.body })
        .then((response) => response.json())
    case 'redirect':
      return await client.frames[':url'].redirect
        .$post({ param: { url }, json: data.body })
        .then((response) => response.json())
        .then((json) => {
          const { context, frame } = previousData
          return { context, frame, ...json }
        })
  }
}

export async function handleBack() {
  const { dataKey, dataMap, logs, stack, stackIndex } = store.getState()

  const previousStackIndex = stackIndex - 1
  const previousStackId = stack[previousStackIndex]
  const data = dataMap[previousStackId]
  if (!data) return

  const json = await performAction(data, dataMap[logs.at(-1) ?? dataKey])
  const id = json.id
  store.setState((state) => ({
    ...state,
    dataKey: id,
    dataMap: { ...state.dataMap, [id]: json },
    inputText: '',
    logs: [...state.logs, id],
    logIndex: -1,
    stackIndex: previousStackIndex,
  }))
}

export async function handleForward() {
  const { dataKey, dataMap, logs, stack, stackIndex } = store.getState()

  const nextStackIndex = stackIndex + 1
  const nextStackId = stack[nextStackIndex]
  const data = dataMap[nextStackId]
  if (!data) return

  const json = await performAction(data, dataMap[logs.at(-1) ?? dataKey])
  const id = json.id
  store.setState((state) => ({
    ...state,
    dataKey: id,
    dataMap: { ...state.dataMap, [id]: json },
    inputText: '',
    logs: [...state.logs, id],
    logIndex: -1,
    stackIndex: nextStackIndex,
  }))
}

export async function handleReload(event: MouseEvent) {
  if (event.shiftKey) {
    // TODO: Reset
    return
  }

  const { dataKey, dataMap, logs } = store.getState()
  const data = dataMap[dataKey]
  if (!data) return

  const json = await performAction(data, dataMap[logs.at(-1) ?? dataKey])
  const id = json.id
  store.setState((state) => ({
    ...state,
    dataKey: id,
    dataMap: { ...state.dataMap, [id]: json },
    inputText: '',
    logs: [...state.logs, id],
    logIndex: -1,
  }))
}

export async function handleSelectNewFrame(url: string) {
  const json = await client.frames[':url']
    .$get({ param: { url: encodeURIComponent(url) } })
    .then((response) => response.json())

  const id = json.id
  store.setState((state) => ({
    ...state,
    dataKey: id,
    dataMap: { ...state.dataMap, [id]: json },
    inputText: '',
    logs: [id],
    logIndex: -1,
    stack: [id],
    stackIndex: 0,
    tab: 'request',
  }))
}
