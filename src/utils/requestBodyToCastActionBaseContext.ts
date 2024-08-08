import type { Context as Context_hono, Input } from 'hono'
import type { FrogConstructorParameters } from '../frog-base.js'
import type { CastActionBaseContext } from '../types/context.js'
import type { Env } from '../types/env.js'
import type { Hub } from '../types/hub.js'
import { getRequestUrl } from './getRequestUrl.js'
import { verifyCastAction } from './verifyCastAction.js'

type RequestBodyToCastActionBaseContextOptions = {
  hub?: Hub | undefined
  verify?: FrogConstructorParameters['verify']
  verifyOrigin?: FrogConstructorParameters['verifyOrigin']
}

type RequestBodyToCastActionBaseContextReturnType<
  env extends Env = Env,
  path extends string = string,
  input extends Input = {},
  //
  _state = env['State'],
> = CastActionBaseContext<env, path, input>

export async function requestBodyToCastActionBaseContext<
  env extends Env,
  path extends string,
  input extends Input,
>(
  c: Context_hono<env, path>,
  {
    hub,
    verify = true,
    verifyOrigin = true,
  }: RequestBodyToCastActionBaseContextOptions,
): Promise<RequestBodyToCastActionBaseContextReturnType<env, path, input>> {
  const { trustedData, untrustedData } =
    (await c.req.json().catch(() => {})) || {}

  const url = getRequestUrl(c.req)

  const trustedCastActionData = await (async () => {
    if (verify === false) return null
    if (!trustedData) return null
    if (!hub) return null
    try {
      const { castActionData } = await verifyCastAction({
        hub,
        frameUrl: untrustedData.url,
        trustedData,
        url: url.href,
        verifyOrigin,
      })
      return castActionData
    } catch (err) {
      if (verify === 'silent') return null
      throw err
    }
  })()

  return {
    env: c.env,
    actionData: trustedCastActionData || untrustedData,
    req: c.req,
    var: c.var,
    verified: Boolean(trustedCastActionData),
  }
}
