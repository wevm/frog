import { waitForJsonRpcResponse } from './jsonRpc/waitForJsonRpcResponse.js'

export type EthSendTransactionSuccessBody = {
  address: string
  transactionHash: string
}

export function waitForSendTransactionResponse(requestId: string) {
  return waitForJsonRpcResponse<EthSendTransactionSuccessBody>(requestId)
}
