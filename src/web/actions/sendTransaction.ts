import type { SendTransactionParameters } from '../../types/transaction.js'
import type { JsonRpcResponseError } from './internal/jsonRpc/types.js'
import {
  listenForSendTransactionResponseMessage,
  type EthSendTransactionSuccessBody,
} from './internal/listenForSendTransactionResponseMessage.js'
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
  return new Promise((resolve, reject) => {
    listenForSendTransactionResponseMessage((message) => {
      if ('result' in message) {
        resolve(message.result)
        return
      }
      reject(message.error)
    }, requestId)
  })
}
