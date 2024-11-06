import type { JsonRpcResponseFailure, JsonRpcResponseSuccess } from './types.js'

export function listenForJsonRpcResponseMessage<resultType>(
  handler: (
    message: JsonRpcResponseSuccess<resultType> | JsonRpcResponseFailure,
  ) => unknown,
  requestId: string,
) {
  if (typeof window === 'undefined')
    throw new Error(
      '`listenForJsonRpcResponseMessage` must be called in the Client Component.',
    )

  const listener = (
    event: MessageEvent<
      JsonRpcResponseSuccess<resultType> | JsonRpcResponseFailure
    >,
  ) => {
    if (
      event.data.id !== requestId ||
      !('result' in event.data || 'error' in event.data)
    )
      return
    handler(event.data)
  }

  window.addEventListener('message', listener)

  return () => window.removeEventListener('message', listener)
}
