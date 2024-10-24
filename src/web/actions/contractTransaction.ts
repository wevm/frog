import {
  type Abi,
  AbiFunctionNotFoundError,
  type ContractFunctionArgs,
  type ContractFunctionName,
  type EncodeFunctionDataParameters,
  type GetAbiItemParameters,
  encodeFunctionData,
  getAbiItem,
} from 'viem'
import type { ContractTransactionParameters } from '../../types/transaction.js'
import type { JsonRpcResponseError } from './internal/jsonRpc/types.js'
import { postSendTransactionRequestMessage } from './internal/postSendTransactionRequestMessage.js'
import {
  type EthSendTransactionSuccessBody,
  waitForSendTransactionResponse,
} from './internal/waitForSendTransactionResponse.js'

type ContractTransactionReturnType = EthSendTransactionSuccessBody
type ContractTransactionErrorType = JsonRpcResponseError
export type {
  ContractTransactionParameters,
  ContractTransactionReturnType,
  ContractTransactionErrorType,
}

export async function contractTransaction<
  const abi extends Abi | readonly unknown[],
  functionName extends ContractFunctionName<abi, 'nonpayable' | 'payable'>,
  args extends ContractFunctionArgs<
    abi,
    'nonpayable' | 'payable',
    functionName
  >,
>(
  parameters: ContractTransactionParameters<abi, functionName, args>,
  requestIdOverride?: string,
): Promise<ContractTransactionReturnType> {
  const { abi, chainId, functionName, gas, to, args, attribution, value } =
    parameters

  const abiItem = getAbiItem({
    abi: abi,
    name: functionName,
    args,
  } as GetAbiItemParameters)
  if (!abiItem) throw new AbiFunctionNotFoundError(functionName)

  const abiErrorItems = (abi as Abi).filter((item) => item.type === 'error')

  const requestId = postSendTransactionRequestMessage(
    {
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
    },
    requestIdOverride,
  )
  return waitForSendTransactionResponse(requestId)
}
