import type { SendTransactionParameters } from '../../types/transaction.js'
import type { JsonRpcResponseError } from './internal/jsonRpc/types.js'
import {
  type EthSendTransactionSuccessBody,
  waitForSendTransactionResponse,
} from './internal/waitForSendTransactionResponse.js'
import { postSendTransactionRequestMessage } from './internal/postSendTransactionRequestMessage.js'

type SendTransactionReturnType = EthSendTransactionSuccessBody
type SendTransactionErrorType = JsonRpcResponseError
export type {
  SendTransactionParameters,
  SendTransactionReturnType,
  SendTransactionErrorType,
}

export async function sendTransaction(
  parameters: SendTransactionParameters,
  requestIdOverride?: string,
): Promise<SendTransactionReturnType> {
  const requestId = postSendTransactionRequestMessage(
    parameters,
    requestIdOverride,
  )
  return waitForSendTransactionResponse(requestId)
}
