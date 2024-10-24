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
  window.parent.postMessage(
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
