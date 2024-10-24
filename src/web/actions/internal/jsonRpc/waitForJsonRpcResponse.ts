import { JsonRpcError } from './errors.js'
import { listenForJsonRpcResponseMessage } from './listenForJsonRpcResponseMessage.js'

export function waitForJsonRpcResponse<resultType>(
  requestId: string,
): Promise<resultType> {
  return new Promise<resultType>((resolve, reject) => {
    listenForJsonRpcResponseMessage<resultType>((message) => {
      if ('result' in message) {
        resolve(message.result)
        return
      }
      reject(
        new JsonRpcError(requestId, message.error.code, message.error.message),
      )
    }, requestId)
  })
}
