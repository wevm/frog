import type {
  JsonRpcResponseFailure,
  JsonRpcResponseSuccess,
} from './jsonRpc/types.js'
import { waitForJsonRpcResponse } from './jsonRpc/waitForJsonRpcResponse.js'

export type EthSignTypedDataResponse =
  | JsonRpcResponseSuccess<EthSignTypedDataSuccessBody>
  | JsonRpcResponseFailure

export type EthSignTypedDataSuccessBody = {
  address: string
  signature: string
}

export function waitForSignTypedDataResponse(requestId: string) {
  return waitForJsonRpcResponse<EthSignTypedDataSuccessBody>(requestId)
}
