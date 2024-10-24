import { waitForJsonRpcResponse } from './jsonRpc/waitForJsonRpcResponse.js'

export type FcCreateCastSuccessBody = {
  success: boolean
}

export function waitForCreateCastResponse(requestId: string) {
  return waitForJsonRpcResponse<FcCreateCastSuccessBody>(requestId)
}
