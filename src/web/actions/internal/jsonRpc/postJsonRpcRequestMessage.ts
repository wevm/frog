import type { JsonRpcMethod } from './types.js'

export type PostJsonRpcRequestMessageReturnType = string

export function postJsonRpcRequestMessage(
  method: JsonRpcMethod,
  parameters: any,
  requestIdOverride?: string,
): PostJsonRpcRequestMessageReturnType {
  if (typeof window === 'undefined')
    throw new Error(
      '`postJsonRpcRequestMessage` must be called in the Client Component.',
    )

  const requestId = requestIdOverride ?? crypto.randomUUID()
  const message = {
    jsonrpc: '2.0',
    id: requestId,
    method,
    params: parameters,
  }

  // ref: https://github.com/react-native-webview/react-native-webview/blob/master/docs/Guide.md#the-windowreactnativewebviewpostmessage-method-and-onmessage-prop
  if (
    (
      window as {
        ReactNativeWebView?: any
      }
    ).ReactNativeWebView
  ) {
    ;(
      window as {
        ReactNativeWebView?: { postMessage: (msg: string) => void }
      }
    ).ReactNativeWebView?.postMessage(JSON.stringify(message))
  } else {
    window.parent.postMessage(message, '*')
  }
  return requestId
}
