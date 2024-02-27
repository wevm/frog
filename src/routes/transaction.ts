import type { Env } from 'hono'
import { type EncodeFunctionDataParameters, encodeFunctionData } from 'viem'

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
  this.hono.get(parsePath(path), async (c) => {
    const transaction = await handler({
      contract(parameters) {
        const { abi, chainId, description, functionName, to, value, args } =
          parameters
        const response: TransactionResponse = {
          chainId,
          description,
          to,
          value,
        }
        response.data = encodeFunctionData({
          abi,
          args,
          functionName,
        } as EncodeFunctionDataParameters)
        return response
      },
      req: c.req,
      res(response) {
        return response
      },
    })
    return c.json(transaction)
  })
}
