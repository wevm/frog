import type { Schema } from 'hono'
import type { FrogBase, RouteOptions } from '../frog-base.js'
import type { TransactionContext } from '../types/context.js'
import type { Env } from '../types/env.js'
import type { HandlerResponse } from '../types/response.js'
import type { TransactionResponse } from '../types/transaction.js'
import { getTransactionContext } from '../utils/getTransactionContext.js'
import { parsePath } from '../utils/parsePath.js'
import { requestBodyToContext } from '../utils/requestBodyToContext.js'

export function transaction<
  env extends Env,
  schema extends Schema,
  basePath extends string,
  //
  _state = env['State'],
>(
  this: FrogBase<env, schema, basePath, _state>,
  path: string,
  handler: (
    context: TransactionContext<env, string, _state>,
  ) => HandlerResponse<TransactionResponse>,
  options: RouteOptions = {},
) {
  const { verify = this.verify } = options

  this.hono.post(parsePath(path), async (c) => {
    const { context } = getTransactionContext<env, string, _state>({
      context: await requestBodyToContext(c, {
        hub:
          this.hub || (this.hubApiUrl ? { apiUrl: this.hubApiUrl } : undefined),
        secret: this.secret,
        verify,
      }),
      req: c.req,
    })
    const response = await handler(context)
    if (response instanceof Response) return response
    return c.json(response.data)
  })
}
