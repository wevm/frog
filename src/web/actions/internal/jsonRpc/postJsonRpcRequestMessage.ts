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

  // ref: https://github.com/react-native-webview/react-native-webview/blob/master/docs/Guide.md#the-windowreactnativewebviewpostmessage-method-and-onmessage-prop
  const ambigiousPostMessage =
    (
      window as {
        ReactNativeWebView?: { postMessage: typeof window.postMessage }
      }
    ).ReactNativeWebView?.postMessage ?? window.parent.postMessage

  ambigiousPostMessage(
    {
      jsonrpc: '2.0',
      id: requestId,
      method,
      params: parameters,
    },
    '*',
  )
  return requestId
}
