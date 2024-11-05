import type {
  SendTransactionParameters,
  EthSendTransactionParameters,
} from '../../../types/transaction.js'
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
  const { chainId, attribution, abi, data, gas, to, value } = parameters

  const sendTransactionParams: EthSendTransactionParameters<string> = {
    abi,
    data,
    to,
  }

  if (gas) sendTransactionParams.gas = gas.toString()
  if (value) sendTransactionParams.value = value.toString()

  return postJsonRpcRequestMessage(
    'fc_requestWalletAction',
    {
      action: {
        method: 'eth_sendTransaction',
        attribution,
        chainId,
        params: sendTransactionParams,
      },
    },
    requestIdOverride,
  )
}
