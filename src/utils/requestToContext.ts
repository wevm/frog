import { type Context } from 'hono'
import type { FrogConstructorParameters } from '../frog-base.js'
import { type FrameContext } from '../types.js'
import { deserializeJson } from './deserializeJson.js'
import { parsePath } from './parsePath.js'
import { verifyFrame } from './verifyFrame.js'

type RequestToContextOptions = {
  hubApiUrl: string
  verify?: FrogConstructorParameters['verify']
}

type RequestToContextReturnType<state = unknown> = Pick<
  FrameContext<string, state>,
  | 'initialUrl'
  | 'previousState'
  | 'previousIntentData'
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
  const { initialUrl, previousState, previousIntentData } = untrustedData?.state
    ? deserializeJson(untrustedData.state)
    : ({} as any)

  const verified = await (async () => {
    if (verify === false) return false
    if (!trustedData) return false
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
    initialUrl: initialUrl ? initialUrl : parsePath(request.url),
    previousState,
    previousIntentData,
    frameData: untrustedData,
    status: request.method === 'POST' ? 'response' : 'initial',
    url: request.url,
    verified,
  }
}
