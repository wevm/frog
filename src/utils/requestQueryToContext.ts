import { type Context as Context_hono } from 'hono'
import type { Context, FrameQueryContext } from '../types/context.js'
import type { Env } from '../types/env.js'
import { fromQuery } from './fromQuery.js'

type RequestQueryToContextReturnType<
  env extends Env = Env,
  path extends string = string,
  //
  _state = env['State'],
> = Context<env, path, _state> & {
  state: _state
}

export function requestQueryToContext<
  env extends Env,
  path extends string,
  //
  _state = env['State'],
>(
  c: Context_hono<env, path>,
): RequestQueryToContextReturnType<env, path, _state> {
  const query = c.req.query()

  const queryContext = fromQuery<FrameQueryContext<env, path, _state>>(query)

  return {
    ...queryContext,
    req: c.req,
    var: c.var,
  }
}
