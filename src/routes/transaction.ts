import type { Env } from 'hono'

import type { FrogBase, RouteOptions } from '../frog-base.js'
import type { TransactionContext } from '../types/context.js'
import type { HandlerResponse } from '../types/response.js'
import type { TransactionResponse } from '../types/transaction.js'
import { getTransactionContext } from '../utils/getTransactionContext.js'
import { parsePath } from '../utils/parsePath.js'
import { requestToContext } from '../utils/requestToContext.js'

export function transaction<state, env extends Env>(
  this: FrogBase<state, env>,
  path: string,
  handler: (
    context: TransactionContext,
  ) => HandlerResponse<TransactionResponse>,
  options: RouteOptions = {},
) {
  const { verify = this.verify } = options

  this.hono.post(parsePath(path), async (c) => {
    const transactionContext = getTransactionContext({
      context: await requestToContext(c.req, {
        hub:
          this.hub || (this.hubApiUrl ? { apiUrl: this.hubApiUrl } : undefined),
        secret: this.secret,
        verify,
      }),
      req: c.req,
    })
    const response = await handler(transactionContext)
    if (response instanceof Response) return response
    return c.json(response.data)
  })
}
