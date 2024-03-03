import type { Env } from 'hono'
import {
  type Abi,
  type EncodeFunctionDataParameters,
  type GetAbiItemParameters,
  encodeFunctionData,
  getAbiItem,
} from 'viem'

import type { FrogBase } from '../frog-base.js'
import type {
  TransactionContext,
  TransactionResponse,
} from '../types/transaction.js'
import { parsePath } from '../utils/parsePath.js'

export function transaction<state, env extends Env>(
  this: FrogBase<state, env>,
  path: string,
  handler: (
    context: TransactionContext,
  ) => TransactionResponse | Promise<TransactionResponse>,
) {
  this.hono.post(parsePath(path), async (c) => {
    const transaction = await handler({
      contract(parameters) {
        const { abi, chainId, functionName, to, args, value } = parameters

        const abiItem = getAbiItem({
          abi: abi,
          name: functionName,
          args,
        } as GetAbiItemParameters)
        // TODO: custom error
        if (!abiItem) throw new Error('could not find abi item')

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
      req: c.req,
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
        return response
      },
      send(parameters) {
        return this.res({
          chainId: parameters.chainId,
          method: 'eth_sendTransaction',
          params: parameters,
        })
      },
    })
    return c.json(transaction)
  })
}
