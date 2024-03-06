import { type Context as Context_hono } from 'hono'
import type { FrogConstructorParameters } from '../frog-base.js'
import type { Context } from '../types/context.js'
import type { Env } from '../types/env.js'
import type { Hub } from '../types/hub.js'
import { deserializeJson } from './deserializeJson.js'
import { fromQuery } from './fromQuery.js'
import * as jws from './jws.js'
import { verifyFrame } from './verifyFrame.js'

type RequestBodyToContextOptions = {
  hub?: Hub | undefined
  secret?: FrogConstructorParameters['secret']
  verify?: FrogConstructorParameters['verify']
}

type RequestBodyToContextReturnType<
  env extends Env = Env,
  path extends string = string,
  //
  _state = env['State'],
> = Context<env, path, _state>

export async function requestBodyToContext<
  env extends Env,
  path extends string,
  //
  _state = env['State'],
>(
  c: Context_hono<env, path>,
  { hub, secret, verify = true }: RequestBodyToContextOptions,
): Promise<RequestBodyToContextReturnType<env, path, _state>> {
  const { trustedData, untrustedData } =
    (await c.req.json().catch(() => {})) || {}
  const { initialPath, previousState, previousButtonValues } =
    await (async () => {
      if (untrustedData?.state) {
        const state = deserializeJson(untrustedData.state) as any
        if (secret && state.previousState)
          state.previousState = JSON.parse(
            await jws.verify(state.previousState, secret),
          )
        return state
      }
      if (c.req.query()) return fromQuery(c.req.query())
      return {} as any
    })()

  const trustedFrameData = await (async () => {
    if (verify === false) return null
    if (!trustedData) return null
    if (!hub) return null
    try {
      const { frameData } = await verifyFrame({
        hub,
        frameUrl: untrustedData.url,
        trustedData,
        url: c.req.url,
      })
      return { ...frameData, state: frameData.state || untrustedData.state }
    } catch (err) {
      if (verify === 'silent') return null
      throw err
    }
  })()

  return {
    env: c.env,
    initialPath: initialPath ? initialPath : new URL(c.req.url).pathname,
    previousState,
    previousButtonValues,
    frameData: trustedFrameData || untrustedData,
    req: c.req,
    status: c.req.method === 'POST' ? 'response' : 'initial',
    url: c.req.url,
    var: c.var,
    verified: Boolean(trustedFrameData),
  }
}
