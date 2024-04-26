import type {
  Abi,
  ContractFunctionArgs,
  ContractFunctionName,
  GetValue,
  Hex,
} from 'viem'

import type { TypedResponse } from './response.js'
import type { UnionWiden, Widen } from './utils.js'

//////////////////////////////////////////////////////
// Raw Transaction

export type ChainNamespace = 'eip155'

/**
 * Current supported chain IDs:
 * - 1: Ethereum
 * - 10: Optimism
 * - 8453: Base
 * - 84532: Base Sepolia
 * - 7777777: Zora
 */
export type ChainIdEip155 = 1 | 10 | 8453 | 84532 | 7777777

export type TransactionParameters = {
  /** A CAIP-2 Chain ID to identify the transaction network. */
  chainId: `${ChainNamespace}:${ChainIdEip155}`
  /** Includes client calldata attribution suffix */
  attribution?: boolean | undefined
} & EthSendTransactionSchema<bigint>

export type TransactionResponse = Pick<
  TransactionParameters,
  'chainId' | 'attribution'
> &
  EthSendTransactionSchema

export type EthSendTransactionSchema<quantity = string> = {
  /** A method ID to identify the type of transaction request. */
  method: 'eth_sendTransaction'
  /** Transaction calldata. */
  params: EthSendTransactionParameters<quantity>
}

export type EthSendTransactionParameters<quantity = string> = {
  /** Contract ABI. */
  abi?: Abi | undefined
  /**
   * Client calldata attribution suffix
   * @default false
   */
  attribution?: boolean | undefined
  /** Transaction calldata. */
  data?: Hex | undefined
  /** Gas limit for the transaction. */
  gas?: quantity
  /** Transaction target address. */
  to: Hex
  /** Value to send with transaction (in wei). */
  value?: quantity
}

export type TransactionResponseFn<parameters> = (
  parameters: parameters,
) => TypedResponse<TransactionResponse>

//////////////////////////////////////////////////////
// Send Transaction

export type SendTransactionParameters = Pick<TransactionParameters, 'chainId'> &
  EthSendTransactionParameters<bigint>

//////////////////////////////////////////////////////
// Contract Transaction

export type ContractTransactionParameters<
  abi extends Abi | readonly unknown[] = Abi,
  functionName extends ContractFunctionName<
    abi,
    'nonpayable' | 'payable'
  > = ContractFunctionName<abi, 'nonpayable' | 'payable'>,
  args extends ContractFunctionArgs<
    abi,
    'nonpayable' | 'payable',
    functionName
  > = ContractFunctionArgs<abi, 'nonpayable' | 'payable', functionName>,
  ///
  allFunctionNames = ContractFunctionName<abi, 'nonpayable' | 'payable'>,
  allArgs = ContractFunctionArgs<abi, 'nonpayable' | 'payable', functionName>,
> = Pick<SendTransactionParameters, 'chainId' | 'to'> & {
  /** Contract ABI. */
  abi: abi
  /** Contract function arguments. */
  args?: (abi extends Abi ? UnionWiden<args> : never) | allArgs | undefined
  /** Includes client calldata attribution suffix */
  attribution?: boolean | undefined
  /** Contract function name to invoke. */
  functionName:
    | allFunctionNames // show all options
    | (functionName extends allFunctionNames ? functionName : never) // infer value
} & (readonly [] extends allArgs ? {} : { args: Widen<args> }) &
  GetValue<abi, functionName>

export type ContractTransactionResponseFn = <
  const abi extends Abi | readonly unknown[],
  functionName extends ContractFunctionName<abi, 'nonpayable' | 'payable'>,
  args extends ContractFunctionArgs<
    abi,
    'nonpayable' | 'payable',
    functionName
  >,
>(
  response: ContractTransactionParameters<abi, functionName, args>,
) => TypedResponse<TransactionResponse>
