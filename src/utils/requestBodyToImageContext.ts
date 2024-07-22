import type { Context as Context_hono, Input } from 'hono'
import type { FrogConstructorParameters } from '../frog-base.js'
import type { Context } from '../types/context.js'
import type { Env } from '../types/env.js'
import { fromQuery } from './fromQuery.js'
import { getRequestUrl } from './getRequestUrl.js'
import * as jws from './jws.js'

type RequestBodyToImageContextOptions = {
  secret?: FrogConstructorParameters['secret']
}

type RequestBodyToImageContextReturnType<
  env extends Env = Env,
  path extends string = string,
  input extends Input = {},
  //
  _state = env['State'],
> = Omit<
  Context<env, path, input, _state>,
  'frameData' | 'verified' | 'status' | 'initialPath'
>

export async function requestBodyToImageContext<
  env extends Env,
  path extends string,
  input extends Input,
  //
  _state = env['State'],
>(
  c: Context_hono<env, path>,
  { secret }: RequestBodyToImageContextOptions,
): Promise<RequestBodyToImageContextReturnType<env, path, input, _state>> {
  const { previousState, previousButtonValues } = await (async () => {
    if (c.req.query()) {
      let { previousState, previousButtonValues } = fromQuery(
        c.req.query(),
      ) as any
      if (secret && previousState)
        previousState = JSON.parse(await jws.verify(previousState, secret))
      return { previousState, previousButtonValues }
    }
    return {} as any
  })()

  const url = getRequestUrl(c.req)

  return {
    env: c.env,
    previousState,
    previousButtonValues,
    req: c.req,
    url: url.href,
    var: c.var,
  }
}
