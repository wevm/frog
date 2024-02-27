import type { Context, Env } from 'hono'
import type { Abi, ContractFunctionArgs, ContractFunctionName } from 'viem'
import type { UnionWiden, Widen } from './utils.js'

export type TransactionContext<path extends string = string> = {
  /** HTTP request object. */
  req: Context<Env, path>['req']
  /** Transaction response that includes properties such as: data, to, value, etc */
  res: TransactionResponseFn
  /** Contract response that includes properties such as: abi, functionName, to, value, etc */
  contract: ContractTransactionResponseFn
}

export type TransactionResponse = {
  /** Chain ID relating to the transaction. */
  chainId: string
  /** Description of the transaction. */
  description: string
  /** Transaction calldata. */
  data?: string | undefined
  /** Destination address of the transaction. */
  to: string
  /** Value to send with the transaction. */
  value: string
}

export type TransactionResponseFn = (
  response: TransactionResponse,
) => TransactionResponse

export type ContractTransactionResponse<
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
> = {
  /** Contract ABI. */
  abi: abi
  /** Contract function arguments. */
  args?: (abi extends Abi ? UnionWiden<args> : never) | allArgs | undefined
  /** Chain ID relating to the transaction. */
  chainId: string
  /** Description of the transaction. */
  description: string
  /** Contract function name to invoke. */
  functionName:
    | allFunctionNames // show all options
    | (functionName extends allFunctionNames ? functionName : never) // infer value
  /** Destination address of the transaction. */
  to: string
  /** Value to send with the transaction. */
  value: string
} & (readonly [] extends allArgs ? {} : { args: Widen<args> })

export type ContractTransactionResponseFn = <
  const abi extends Abi | readonly unknown[],
  functionName extends ContractFunctionName<abi, 'nonpayable' | 'payable'>,
  args extends ContractFunctionArgs<
    abi,
    'nonpayable' | 'payable',
    functionName
  >,
>(
  response: ContractTransactionResponse<abi, functionName, args>,
) => TransactionResponse
