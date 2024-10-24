import type { TypedData } from 'viem'
import type { SignTypedDataParameters } from '../../../types/signature.js'
import {
  postJsonRpcRequestMessage,
  type PostJsonRpcRequestMessageReturnType,
} from './jsonRpc/postJsonRpcRequestMessage.js'

export type SignTypedDataRequestMessageParameters<
  typedData extends TypedData | Record<string, unknown>,
  primaryType extends keyof typedData | 'EIP712Domain',
> = SignTypedDataParameters<typedData, primaryType>
export type SignTypedDataRequestMessageReturnType =
  PostJsonRpcRequestMessageReturnType

export function postSignTypedDataRequestMessage<
  const typedData extends TypedData | Record<string, unknown>,
  primaryType extends keyof typedData | 'EIP712Domain',
>(
  parameters: SignTypedDataRequestMessageParameters<typedData, primaryType>,
  requestIdOverride?: string,
) {
  return postJsonRpcRequestMessage(
    'fc_requestWalletAction',
    parameters,
    requestIdOverride,
  )
}
