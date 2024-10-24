import type { JsonRpcResponseError } from './internal/jsonRpc/types.js'
import {
  type CreateCastSuccessBody,
  listenForCreateCastResponseMessage,
} from './internal/listenForCreateCastResponseMessage.js'
import {
  type CreateCastRequestMessageParameters,
  postCreateCastRequestMessage,
} from './internal/postCreateCastRequestMessage.js'

type CreateCastParameters = CreateCastRequestMessageParameters
type CreateCastReturnType = CreateCastSuccessBody
type CreateCastErrorType = JsonRpcResponseError
export type { CreateCastParameters, CreateCastReturnType, CreateCastErrorType }

export async function createCast(
  parameters: CreateCastParameters,
  requestIdOverride?: string,
): Promise<CreateCastReturnType> {
  const requestId = postCreateCastRequestMessage(parameters, requestIdOverride)
  return new Promise((resolve, reject) => {
    listenForCreateCastResponseMessage((message) => {
      if ('result' in message) {
        resolve(message.result)
        return
      }
      reject(message.error)
    }, requestId)
  })
}
