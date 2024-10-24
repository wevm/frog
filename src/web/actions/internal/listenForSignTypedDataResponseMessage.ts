import { listenForJsonRpcResponseMessage } from './jsonRpc/listenForJsonRpcResponseMessage.js'
import type {
  JsonRpcResponseFailure,
  JsonRpcResponseSuccess,
} from './jsonRpc/types.js'

export type EthSignTypedDataResponse =
  | JsonRpcResponseSuccess<EthSignTypedDataSuccessBody>
  | JsonRpcResponseFailure

export type EthSignTypedDataSuccessBody = {
  address: string
  signature: string
}

export function listenForSignTypedDataResponseMessage(
  handler: (message: EthSignTypedDataResponse) => unknown,
  requestId: string,
) {
  return listenForJsonRpcResponseMessage<EthSignTypedDataSuccessBody>(
    handler,
    requestId,
  )
}
