import { type Context } from 'hono'
import type { FrogConstructorParameters } from '../frog-base.js'
import { type FrameContext } from '../types.js'
import { deserializeJson } from './deserializeJson.js'
import { fromQuery } from './fromQuery.js'
import { verifyFrame } from './verifyFrame.js'

type RequestToContextOptions = {
  hubApiUrl?: string | undefined
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
  request: Context['req'],
  { hubApiUrl, verify = true }: RequestToContextOptions,
): Promise<RequestToContextReturnType<state>> {
  const { trustedData, untrustedData } =
    (await request.json().catch(() => {})) || {}
  const { initialPath, previousState, previousButtonValues } = (() => {
    if (untrustedData?.state) return deserializeJson(untrustedData.state)
    if (request.query()) return fromQuery(request.query())
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
        url: request.url,
      })
      return true
    } catch (err) {
      if (verify === 'silent') return false
      throw err
    }
  })()

  return {
    initialPath: initialPath ? initialPath : new URL(request.url).pathname,
    previousState,
    previousButtonValues,
    frameData: untrustedData,
    status: request.method === 'POST' ? 'response' : 'initial',
    url: request.url,
    verified,
  }
}
