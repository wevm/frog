import type { SendTransactionParameters } from '../../../types/transaction.js'
import {
  type PostJsonRpcRequestMessageReturnType,
  postJsonRpcRequestMessage,
} from './jsonRpc/postJsonRpcRequestMessage.js'

export type SendTransactionRequestMessageParameters = SendTransactionParameters
export type SendTransactionRequestMessageReturnType =
  PostJsonRpcRequestMessageReturnType

export function postSendTransactionRequestMessage(
  parameters: SendTransactionRequestMessageParameters,
  requestIdOverride?: string,
) {
  return postJsonRpcRequestMessage(
    'fc_requestWalletAction',
    parameters,
    requestIdOverride,
  )
}
