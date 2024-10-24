import { listenForJsonRpcResponseMessage } from './jsonRpc/listenForJsonRpcResponseMessage.js'
import type {
  JsonRpcResponseSuccess,
  JsonRpcResponseFailure,
} from './jsonRpc/types.js'

export type CreateCastResponse =
  | JsonRpcResponseSuccess<CreateCastSuccessBody>
  | JsonRpcResponseFailure

export type CreateCastSuccessBody = {
  success: boolean
}

export function listenForCreateCastResponseMessage(
  handler: (message: CreateCastResponse) => unknown,
  requestId: string,
) {
  return listenForJsonRpcResponseMessage<CreateCastSuccessBody>(
    handler,
    requestId,
  )
}
