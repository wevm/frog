import type { TypedData } from 'viem'
import type { SignTypedDataParameters } from '../../types/signature.js'
import type { JsonRpcResponseError } from './internal/jsonRpc/types.js'
import {
  type EthSignTypedDataSuccessBody,
  listenForSignTypedDataResponseMessage,
} from './internal/listenForSignTypedDataResponseMessage.js'
import { postSignTypedDataRequestMessage } from './internal/postSignTypedDataRequestMessage.js'

type SignTypedDataReturnType = EthSignTypedDataSuccessBody
type SignTypedDataErrorType = JsonRpcResponseError
export type {
  SignTypedDataParameters,
  SignTypedDataReturnType,
  SignTypedDataErrorType,
}

export async function signTypedData<
  const typedData extends TypedData | Record<string, unknown>,
  primaryType extends keyof typedData | 'EIP712Domain',
>(
  parameters: SignTypedDataParameters<typedData, primaryType>,
  requestIdOverride?: string,
): Promise<SignTypedDataReturnType> {
  const requestId = postSignTypedDataRequestMessage<typedData, primaryType>(
    parameters,
    requestIdOverride,
  )
  return new Promise((resolve, reject) => {
    listenForSignTypedDataResponseMessage((message) => {
      if ('result' in message) {
        resolve(message.result)
        return
      }
      reject(message.error)
    }, requestId)
  })
}
