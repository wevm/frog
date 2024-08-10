import type { Context as Context_hono, Input } from 'hono'
import type { FrogConstructorParameters } from '../frog-base.js'
import type { ComposerActionBaseContext } from '../types/context.js'
import type { Env } from '../types/env.js'
import type { Hub } from '../types/hub.js'
import { getRequestUrl } from './getRequestUrl.js'
import { verifyComposerAction } from './verifyComposerAction.js'

type RequestBodyToComposerActionBaseContextOptions = {
  hub?: Hub | undefined
  verify?: FrogConstructorParameters['verify']
  verifyOrigin?: FrogConstructorParameters['verifyOrigin']
}

type RequestBodyToComposerActionBaseContextReturnType<
  env extends Env = Env,
  path extends string = string,
  input extends Input = {},
> = ComposerActionBaseContext<env, path, input>

export async function requestBodyToComposerActionBaseContext<
  env extends Env,
  path extends string,
  input extends Input,
>(
  c: Context_hono<env, path>,
  {
    hub,
    verify = true,
    verifyOrigin = true,
  }: RequestBodyToComposerActionBaseContextOptions,
): Promise<RequestBodyToComposerActionBaseContextReturnType<env, path, input>> {
  const { trustedData, untrustedData } =
    (await c.req.json().catch(() => {})) || {}

  const url = getRequestUrl(c.req)

  const trustedComposerActionData = await (async () => {
    if (verify === false) return null
    if (!trustedData) return null
    if (!hub) return null
    try {
      const { composerActionData } = await verifyComposerAction({
        hub,
        frameUrl: untrustedData.url,
        trustedData,
        url: url.href,
        verifyOrigin,
      })
      return composerActionData
    } catch (err) {
      if (verify === 'silent') return null
      throw err
    }
  })()

  return {
    env: c.env,
    actionData: trustedComposerActionData || untrustedData,
    req: c.req,
    var: c.var,
    verified: Boolean(trustedComposerActionData),
  }
}
