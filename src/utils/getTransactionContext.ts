import { type HonoRequest } from 'hono'
import {
  type Abi,
  AbiFunctionNotFoundError,
  type EncodeFunctionDataParameters,
  type GetAbiItemParameters,
  encodeFunctionData,
  getAbiItem,
} from 'viem'
import type { Context, TransactionContext } from '../types/context.js'
import type { TransactionResponse } from '../types/transaction.js'
import { getIntentState } from './getIntentState.js'

type GetTransactionContextParameters<state = unknown> = {
  context: Context<state>
  req: HonoRequest
}

export function getTransactionContext<state>(
  parameters: GetTransactionContextParameters<state>,
): TransactionContext<string, state> {
  const { context, req } = parameters
  const {
    frameData,
    initialPath,
    previousButtonValues,
    previousState,
    status,
    verified,
    url,
  } = context || {}

  const { buttonValue, inputText } = getIntentState({
    buttonValues: previousButtonValues || [],
    frameData,
  })

  return {
    buttonIndex: frameData?.buttonIndex,
    buttonValue,
    contract(parameters) {
      const { abi, chainId, functionName, to, args, value } = parameters

      const abiItem = getAbiItem({
        abi: abi,
        name: functionName,
        args,
      } as GetAbiItemParameters)
      if (!abiItem) throw new AbiFunctionNotFoundError(functionName)

      const abiErrorItems = (abi as Abi).filter((item) => item.type === 'error')

      return this.send({
        abi: [abiItem, ...abiErrorItems],
        chainId,
        data: encodeFunctionData({
          abi,
          args,
          functionName,
        } as EncodeFunctionDataParameters),
        to,
        value,
      })
    },
    frameData,
    initialPath,
    inputText,
    previousButtonValues,
    previousState,
    req,
    res(parameters) {
      const { chainId, method, params } = parameters
      const { abi, data, to, value } = params
      const response: TransactionResponse = {
        chainId,
        method,
        params: {
          abi,
          data,
          to,
        },
      }
      if (value) response.params.value = value.toString()
      return { data: response, format: 'transaction' }
    },
    send(parameters) {
      return this.res({
        chainId: parameters.chainId,
        method: 'eth_sendTransaction',
        params: parameters,
      })
    },
    status,
    verified,
    url,
  }
}
