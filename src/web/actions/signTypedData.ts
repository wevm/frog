import type { TypedData } from 'viem'
import type { SignTypedDataParameters } from '../../types/signature.js'
import type { JsonRpcResponseError } from './internal/jsonRpc/types.js'
import { postSignTypedDataRequestMessage } from './internal/postSignTypedDataRequestMessage.js'
import {
  type EthSignTypedDataSuccessBody,
  waitForSignTypedDataResponse,
} from './internal/waitForSignTypedDataResponse.js'

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
  return waitForSignTypedDataResponse(requestId)
}
