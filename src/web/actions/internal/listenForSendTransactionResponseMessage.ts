import { listenForJsonRpcResponseMessage } from './jsonRpc/listenForJsonRpcResponseMessage.js'
import type {
  JsonRpcResponseFailure,
  JsonRpcResponseSuccess,
} from './jsonRpc/types.js'

type EthSendTransactionResponse =
  | JsonRpcResponseSuccess<EthSendTransactionSuccessBody>
  | JsonRpcResponseFailure

export type EthSendTransactionSuccessBody = {
  address: string
  transactionHash: string
}

export function listenForSendTransactionResponseMessage(
  handler: (message: EthSendTransactionResponse) => unknown,
  requestId: string,
) {
  return listenForJsonRpcResponseMessage<EthSendTransactionSuccessBody>(
    handler,
    requestId,
  )
}
