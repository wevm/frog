import type { Context, Env } from 'hono'
import type {
  Abi,
  ContractFunctionArgs,
  ContractFunctionName,
  GetValue,
  Hex,
} from 'viem'
import type { UnionWiden, Widen } from './utils.js'

export type TransactionContext<path extends string = string> = {
  /**
   * Contract transaction request.
   *
   * This is a convenience method for "contract transaction" requests as defined in the [Transaction Spec](https://www.notion.so/warpcast/Frame-Transactions-Public-Draft-v2-9d9f9f4f527249519a41bd8d16165f73?pvs=4#1b69c268f0684c978fbdf4d331ab8869),
   * with a type-safe interface to infer types based on a provided `abi`.
   */
  contract: ContractTransactionResponseFn
  /**
   * HTTP request object.
   */
  req: Context<Env, path>['req']
  /**
   * Raw transaction request.
   * @see https://www.notion.so/warpcast/Frame-Transactions-Public-Draft-v2-9d9f9f4f527249519a41bd8d16165f73?pvs=4#1b69c268f0684c978fbdf4d331ab8869
   */
  res: TransactionResponseFn
  /**
   * Send transaction request.
   *
   * This is a convenience method for "send transaction" requests as defined in the [Transaction Spec](https://www.notion.so/warpcast/Frame-Transactions-Public-Draft-v2-9d9f9f4f527249519a41bd8d16165f73?pvs=4#1b69c268f0684c978fbdf4d331ab8869).
   */
  send: SendTransactionResponseFn
}

//////////////////////////////////////////////////////
// Raw Transaction

export type TransactionParameters = {
  /** A CAIP-2 Chain ID to identify the transaction network. */
  chainId: `eip155:${number}`
} & EthSendTransactionSchema<bigint>

export type TransactionResponse = Pick<TransactionParameters, 'chainId'> &
  EthSendTransactionSchema

export type EthSendTransactionSchema<quantity = string> = {
  /** A method ID to identify the type of transaction request. */
  method: 'eth_sendTransaction'
  /** Transaction calldata. */
  params: EthSendTransactionParameters<quantity>
}

export type EthSendTransactionParameters<quantity = string> = {
  abi?: Abi | undefined
  data?: Hex | undefined
  to: Hex
  value?: quantity
}

export type TransactionResponseFn = (
  parameters: TransactionParameters,
) => TransactionResponse

//////////////////////////////////////////////////////
// Send Transaction

type SendTransactionParameters = {
  chainId: `eip155:${number}`
} & EthSendTransactionParameters<bigint>

export type SendTransactionResponseFn = (
  parameters: SendTransactionParameters,
) => TransactionResponse

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
> = Pick<TransactionParameters, 'chainId'> & {
  /** Contract ABI. */
  abi: abi
  /** Contract function arguments. */
  args?: (abi extends Abi ? UnionWiden<args> : never) | allArgs | undefined
  /** Contract function name to invoke. */
  functionName:
    | allFunctionNames // show all options
    | (functionName extends allFunctionNames ? functionName : never) // infer value
  /** Destination address of the transaction. */
  to: Hex
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
) => TransactionResponse
