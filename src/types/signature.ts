import type { TypedData, TypedDataDefinition } from 'viem'
import type { ChainIdEip155, ChainNamespace } from './transaction.js'

import type { TypedResponse } from './response.js'

export type SignatureParameters = {
  /** A CAIP-2 Chain ID to identify the signature network. */
  chainId: `${ChainNamespace}:${ChainIdEip155}`
} & EthSignTypedDataV4Schema<any, any>

export type SignatureResponse = Pick<SignatureParameters, 'chainId'> &
  EthSignTypedDataV4Schema<any, any>

export type EthSignTypedDataV4Parameters<
  typedData extends TypedData | Record<string, unknown>,
  primaryType extends keyof typedData | 'EIP712Domain',
> = TypedDataDefinition<typedData, primaryType>

export type EthSignTypedDataV4Schema<
  typedData extends TypedData | Record<string, unknown>,
  primaryType extends keyof typedData | 'EIP712Domain',
> = {
  /** A method ID to identify the type of signature request. */
  method: 'eth_signTypedData_v4'
  /** Signature calldata. */
  params: EthSignTypedDataV4Parameters<typedData, primaryType>
}

export type SignatureResponseFn<parameters> = (
  parameters: parameters,
) => TypedResponse<SignatureResponse>

//////////////////////////////////////////////////////
// Sign Typed Data

export type SignTypedDataParameters<
  typedData extends TypedData | Record<string, unknown>,
  primaryType extends keyof typedData | 'EIP712Domain',
> = Pick<SignatureParameters, 'chainId'> &
  EthSignTypedDataV4Parameters<typedData, primaryType>

export type SignTypedDataResponseFn = <
  const typedData extends TypedData | Record<string, unknown>,
  primaryType extends keyof typedData | 'EIP712Domain',
>(
  response: SignTypedDataParameters<typedData, primaryType>,
) => TypedResponse<SignatureResponse>
