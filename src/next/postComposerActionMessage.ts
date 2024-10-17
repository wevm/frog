import {
  getAbiItem,
  type Abi,
  type ContractFunctionArgs,
  type ContractFunctionName,
  type GetAbiItemParameters,
  AbiFunctionNotFoundError,
  encodeFunctionData,
  type EncodeFunctionDataParameters,
  type TypedData,
} from 'viem'
import type {
  ContractTransactionParameters,
  SendTransactionParameters,
} from '../types/transaction.js'
import type { SignTypedDataParameters } from '../types/signature.js'

export type ComposerActionMessageData = {
  cast: {
    embeds: string[]
    text: string
  }
}

export type {
  ContractTransactionParameters,
  SendTransactionParameters,
  SignTypedDataParameters,
}

/**
 * Posts Composer Create Cast Action Message to `window.parent`.
 *
 * This is a convinience method and it calls `postComposerActionMessage` under the hood.
 */
export function postComposerCreateCastActionMessage(
  parameters: ComposerActionMessageData,
) {
  if (typeof window === 'undefined')
    throw new Error(
      '`postComposerActionMessage` must be called in the Client Component.',
    )

  window.parent.postMessage(
    {
      type: 'createCast',
      data: {
        cast: parameters,
      },
    },
    '*',
  )
}

export function postComposerRequestSendTransactionMessage(
  parameters: SendTransactionParameters,
  requestIdOverride?: string,
) {
  if (typeof window === 'undefined')
    throw new Error(
      '`postComposerRequestTransactionMessage` must be called in the Client Component.',
    )

  window.parent.postMessage(
    {
      type: 'requestTransaction',
      data: {
        requestId: requestIdOverride ?? crypto.randomUUID(),
        tx: parameters,
      },
    },
    '*',
  )
}

export function postComposerRequestContractTransactionMessage<
  const abi extends Abi | readonly unknown[],
  functionName extends ContractFunctionName<abi, 'nonpayable' | 'payable'>,
  args extends ContractFunctionArgs<
    abi,
    'nonpayable' | 'payable',
    functionName
  >,
>(parameters: ContractTransactionParameters<abi, functionName, args>) {
  if (typeof window === 'undefined')
    throw new Error(
      '`postComposerRequestTransactionMessage` must be called in the Client Component.',
    )

  const { abi, chainId, functionName, gas, to, args, attribution, value } =
    parameters

  const abiItem = getAbiItem({
    abi: abi,
    name: functionName,
    args,
  } as GetAbiItemParameters)
  if (!abiItem) throw new AbiFunctionNotFoundError(functionName)

  const abiErrorItems = (abi as Abi).filter((item) => item.type === 'error')

  return postComposerRequestSendTransactionMessage({
    abi: [abiItem, ...abiErrorItems],
    attribution,
    chainId,
    data: encodeFunctionData({
      abi,
      args,
      functionName,
    } as EncodeFunctionDataParameters),
    gas,
    to,
    value,
  })
}

export function postComposerRequestSignTypedDataMessage<
  const typedData extends TypedData | Record<string, unknown>,
  primaryType extends keyof typedData | 'EIP712Domain',
>(
  parameters: SignTypedDataParameters<typedData, primaryType>,
  requestIdOverride?: string,
) {
  if (typeof window === 'undefined')
    throw new Error(
      '`postComposerRequestTransactionMessage` must be called in the Client Component.',
    )

  window.parent.postMessage(
    {
      type: 'requestTransaction',
      data: {
        requestId: requestIdOverride ?? crypto.randomUUID(),
        tx: parameters,
      },
    },
    '*',
  )
}
