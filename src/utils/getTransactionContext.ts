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
import type { Env } from '../types/env.js'
import type { TransactionResponse } from '../types/transaction.js'
import { getIntentState } from './getIntentState.js'

type GetTransactionContextParameters<
  env extends Env = Env,
  path extends string = string,
  //
  _state = env['State'],
> = {
  context: Context<env, path, _state>
  req: HonoRequest
}

type GetTransactionContextReturnType<
  env extends Env = Env,
  path extends string = string,
  //
  _state = env['State'],
> = {
  context: TransactionContext<env, path, _state>
}

export function getTransactionContext<
  env extends Env,
  path extends string,
  //
  _state = env['State'],
>(
  parameters: GetTransactionContextParameters<env, path, _state>,
): GetTransactionContextReturnType<env, path, _state> {
  const { context } = parameters
  const {
    env,
    frameData,
    initialPath,
    previousButtonValues,
    previousState,
    req,
    status,
    verified,
    url,
  } = context || {}

  const { buttonValue, inputText } = getIntentState({
    buttonValues: previousButtonValues || [],
    frameData,
  })

  return {
    context: {
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

        const abiErrorItems = (abi as Abi).filter(
          (item) => item.type === 'error',
        )

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
      env,
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
      var: context.var,
      verified,
      url,
    },
  }
}
