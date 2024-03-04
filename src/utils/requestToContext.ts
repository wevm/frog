import { type Context } from 'hono'
import type { FrogConstructorParameters } from '../frog-base.js'
import { type FrameContext } from '../types/frame.js'
import type { Hub } from '../types/hub.js'
import { deserializeJson } from './deserializeJson.js'
import { fromQuery } from './fromQuery.js'
import * as jws from './jws.js'
import { verifyFrame } from './verifyFrame.js'

type RequestToContextOptions = {
  hub?: Hub | undefined
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
  { hub, secret, verify = true }: RequestToContextOptions,
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

  const trustedFrameData = await (async () => {
    if (verify === false) return null
    if (!trustedData) return null
    if (!hub) return null
    try {
      const { frameData } = await verifyFrame({
        hub,
        frameUrl: untrustedData.url,
        trustedData,
        url: req.url,
      })
      return { ...frameData, state: frameData.state || untrustedData.state }
    } catch (err) {
      if (verify === 'silent') return null
      throw err
    }
  })()

  return {
    initialPath: initialPath ? initialPath : new URL(req.url).pathname,
    previousState,
    previousButtonValues,
    frameData: trustedFrameData || untrustedData,
    status: req.method === 'POST' ? 'response' : 'initial',
    url: req.url,
    verified: Boolean(trustedFrameData),
  }
}
