import type { Context as Context_Hono, HonoRequest, Input } from 'hono'
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
  input extends Input = {},
  //
  _state = env['State'],
> = {
  context: Context<env, path, input, _state>
  contextHono: Context_Hono<env, path, input>
  initialState:
    | ((c: Context_Hono<env>) => _state | Promise<_state>)
    | _state
    | undefined
  req: HonoRequest
}

type GetTransactionContextReturnType<
  env extends Env = Env,
  path extends string = string,
  input extends Input = {},
  //
  _state = env['State'],
> = Promise<{
  context: TransactionContext<env, path, input, _state>
}>

export async function getTransactionContext<
  env extends Env,
  path extends string,
  input extends Input,
  //
  _state = env['State'],
>(
  parameters: GetTransactionContextParameters<env, path, input, _state>,
): GetTransactionContextReturnType<env, path, input, _state> {
  const { context, contextHono } = parameters
  const {
    env,
    frameData,
    initialPath,
    previousButtonValues,
    req,
    status,
    verified,
    url,
  } = context || {}

  const previousState = await (async () => {
    if (context.previousState) return context.previousState

    if (typeof parameters.initialState === 'function')
      return await (parameters.initialState as any)(contextHono)
    return parameters.initialState
  })()

  const { buttonValue, inputText } = getIntentState({
    buttonValues: previousButtonValues || [],
    frameData,
  })

  return {
    context: {
      address: frameData?.address!,
      buttonIndex: frameData?.buttonIndex,
      buttonValue,
      contract(parameters) {
        const {
          abi,
          chainId,
          functionName,
          gas,
          to,
          args,
          attribution,
          value,
        } = parameters

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
      },
      env,
      error: (data) => ({
        error: data,
        format: 'transaction',
        status: 'error',
      }),
      frameData,
      initialPath,
      inputText,
      previousButtonValues,
      previousState: previousState as any,
      req,
      res(parameters) {
        const { attribution, chainId, method, params } = parameters
        const { abi, data, gas, to, value } = params
        const response: TransactionResponse = {
          attribution,
          chainId,
          method,
          params: {
            abi,
            data,
            to,
          },
        }
        if (gas) response.params.gas = gas.toString()
        if (value) response.params.value = value.toString()
        return { data: response, format: 'transaction', status: 'success' }
      },
      send(parameters) {
        return this.res({
          attribution: parameters.attribution ?? false,
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
