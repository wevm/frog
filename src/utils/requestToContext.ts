import { type Context } from 'hono'
import type { FrogConstructorParameters } from '../frog-base.js'
import { type FrameContext } from '../types.js'
import { deserializeJson } from './deserializeJson.js'
import { fromQuery } from './fromQuery.js'
import * as jws from './jws.js'
import { verifyFrame } from './verifyFrame.js'

type RequestToContextOptions = {
  hubApiUrl?: string | undefined
  secret?: FrogConstructorParameters['secret']
  verify?: FrogConstructorParameters['verify']
}

type RequestToContextReturnType<state = unknown> = Pick<
  FrameContext<string, state>,
  | 'initialPath'
  | 'previousState'
  | 'previousButtonValues'
  | 'frameData'
  | 'status'
  | 'url'
  | 'verified'
>

export async function requestToContext<state>(
  req: Context['req'],
  { hubApiUrl, secret, verify = true }: RequestToContextOptions,
): Promise<RequestToContextReturnType<state>> {
  const { trustedData, untrustedData } =
    (await req.json().catch(() => {})) || {}
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
      if (req.query()) return fromQuery(req.query())
      return {} as any
    })()

  const verified = await (async () => {
    if (verify === false) return false
    if (!trustedData) return false
    if (!hubApiUrl) return false
    try {
      await verifyFrame({
        hubApiUrl,
        frameUrl: untrustedData.url,
        trustedData,
        url: req.url,
      })
      return true
    } catch (err) {
      if (verify === 'silent') return false
      throw err
    }
  })()

  return {
    initialPath: initialPath ? initialPath : new URL(req.url).pathname,
    previousState,
    previousButtonValues,
    frameData: untrustedData,
    status: req.method === 'POST' ? 'response' : 'initial',
    url: req.url,
    verified,
  }
}
