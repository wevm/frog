import type { MouseEvent } from 'react'
import { baseUrl } from '../constants.js'
import { client } from '../lib/api.js'
import { store } from '../lib/store.js'
import type { Data } from '../types/frog.js'

function getBody() {
  const { dataKey, dataMap, inputText, overrides, user } = store.getState()
  const frame = dataMap[dataKey].frame
  return {
    castId: {
      fid: overrides.castFid,
      hash: overrides.castHash,
    },
    fid: overrides.userFid !== user?.userFid ? overrides.userFid : user.userFid,
    fromAddress: undefined,
    inputText,
    state: frame.state,
    transactionId: undefined,
  } as const
}

export async function handlePost(button: {
  index: number
  postUrl: string | undefined
  transactionId?: string | undefined
}) {
  const { index, postUrl, transactionId } = button
  const { dataKey, dataMap } = store.getState()
  const frame = dataMap[dataKey].frame

  const url = postUrl ?? frame.postUrl ?? dataMap[dataKey].url
  const json = await client.frames[':url'].action
    .$post({
      param: { url: encodeURIComponent(url) },
      json: {
        ...getBody(),
        buttonIndex: index,
        transactionId,
        sourceFrameId: dataKey,
      },
    })
    // while this async/await seems useless, it fixes typing issues
    .then(async (response) => await response.json())

  if (json.type === 'error') {
    store.setState((state) => ({
      ...state,
      notification: {
        key: state.dataKey,
        type: 'error',
        title: json.response.error,
        dismissable: true,
      },
    }))
    return
  }

  const id = json.id
  store.setState((state) => {
    const nextStackIndex = state.stackIndex + 1
    return {
      ...state,
      dataKey: id,
      dataMap: {
        ...state.dataMap,
        [id]: json,
      },
      inputText: '',
      logIndex: -1,
      logs: [...state.logs, id],
      stack:
        nextStackIndex < state.stack.length
          ? [...state.stack.slice(0, nextStackIndex), id]
          : [...state.stack, id],
      stackIndex: nextStackIndex,
      notification: null,
    }
  })
}

export async function handlePostRedirect(button: {
  index: number
  target: string | undefined
}) {
  const { index, target } = button
  const { dataKey, dataMap } = store.getState()

  const data = dataMap[dataKey]
  const frame = data.frame
  const sourceFrameId =
    data.type === 'action' || data.type === 'initial'
      ? dataKey
      : data.sourceFrameId

  const url = target ?? frame.postUrl ?? dataMap[sourceFrameId].url
  const json = await client.frames[':url'].redirect
    .$post({
      param: { url: encodeURIComponent(url) },
      json: {
        ...getBody(),
        buttonIndex: index,
        sourceFrameId,
      },
    })
    .then((response) => response.json())

  const id = json.id
  store.setState((state) => {
    const nextStackIndex = state.stackIndex + 1
    return {
      ...state,
      dataKey: id,
      dataMap: {
        ...state.dataMap,
        [id]: {
          ...json,
          context: data.context,
          frame: data.frame,
        },
      },
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

  return json.response.location
}

export async function handleTransaction(button: {
  fromAddress: string | undefined
  index: number
  target: string | undefined
}) {
  const { fromAddress, index, target } = button
  const { dataKey, dataMap } = store.getState()

  const data = dataMap[dataKey]
  const frame = data.frame
  const sourceFrameId =
    data.type === 'action' || data.type === 'initial'
      ? dataKey
      : data.sourceFrameId

  const url = target ?? frame.postUrl ?? dataMap[sourceFrameId].url
  const json = await client.frames[':url'].tx
    .$post({
      param: { url: encodeURIComponent(url) },
      json: {
        ...getBody(),
        fromAddress,
        buttonIndex: index,
        sourceFrameId,
      },
    })
    .then(async (response) => await response.json())

  if (json.type === 'error') {
    return {
      status: 'error',
      message: json.response.error,
    } as const
  }

  const id = json.id
  store.setState((state) => {
    const nextStackIndex = state.stackIndex + 1
    return {
      ...state,
      dataKey: id,
      dataMap: {
        ...state.dataMap,
        [id]: {
          ...json,
          context: data.context,
          frame: data.frame,
        },
      },
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

  return { status: 'success', data: json.response.data } as const
}

export async function performAction(data: Data, previousData: Data) {
  const url = encodeURIComponent(data.url)

  switch (data.type) {
    case 'initial':
      return await client.frames[':url']
        .$get({ param: { url } })
        .then((response) => response.json())
    case 'action': {
      const json = await client.frames[':url'].action
        .$post({ param: { url }, json: data.body })
        .then(async (response) => await response.json())

      if (json.type === 'error') return

      return json
    }
    case 'redirect':
      return await client.frames[':url'].redirect
        .$post({ param: { url }, json: data.body })
        .then((response) => response.json())
        .then((json) => {
          const { context, frame } = previousData
          return { context, frame, ...json }
        })
    case 'tx': {
      const json = await client.frames[':url'].tx
        .$post({ param: { url }, json: data.body })
        .then(async (response) => await response.json())
        .then((json) => {
          const { context, frame } = previousData
          return { context, frame, ...json }
        })

      if (json.type === 'error') return

      return json
    }
  }
}

export async function handleBack() {
  const { dataKey, dataMap, logs, stack, stackIndex } = store.getState()

  const previousStackIndex = stackIndex - 1
  const previousStackId = stack[previousStackIndex]
  const data = dataMap[previousStackId]
  if (!data) return

  const json = await performAction(data, dataMap[logs.at(-1) ?? dataKey])
  if (!json) return

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
  if (!json) return

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
  store.setState((state) => ({ ...state, skipSaveStateToQueryHash: true }))

  const { dataKey, dataMap, logs } = store.getState()
  const data = dataMap[dataKey]
  if (!data) return

  // reset to initial state
  if (event.shiftKey) {
    const url =
      data.type === 'action' || data.type === 'initial'
        ? data.url
        : dataMap[data.sourceFrameId].url
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

    updateFrameQueryParam(json.url)

    store.setState((state) => ({ ...state, skipSaveStateToQueryHash: false }))
    return
  }

  const json = await performAction(data, dataMap[logs.at(-1) ?? dataKey])
  if (!json) return

  const id = json.id

  store.setState((state) => ({
    ...state,
    dataKey: id,
    dataMap: { ...state.dataMap, [id]: json },
    inputText: '',
    logs: [...state.logs, id],
    logIndex: -1,
  }))

  store.setState((state) => ({ ...state, skipSaveStateToQueryHash: false }))
}

export async function handleSelectNewFrame(url: string) {
  store.setState((state) => ({ ...state, skipSaveStateToQueryHash: true }))

  const encodedUrl = encodeURIComponent(url)
  const json = await client.frames[':url']
    .$get({ param: { url: encodedUrl } })
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

  updateFrameQueryParam(url)

  store.setState((state) => ({ ...state, skipSaveStateToQueryHash: false }))
}

function updateFrameQueryParam(url: string) {
  const frameUrl = new URL(url)
  const nextUrl = new URL(baseUrl)
  if (frameUrl.pathname !== '/') {
    const params = new URLSearchParams(nextUrl.search)
    const frameUrls = store.getState().frameUrls
    params.set('url', frameUrls.includes(url) ? frameUrl.pathname : url)
    nextUrl.search = params.toString()
  }

  history.replaceState(null, '', nextUrl.toString())
  document.title = `frame: ${frameUrl.pathname}`
}
