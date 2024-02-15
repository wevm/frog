import type { Context } from 'hono'
import type { FrameContext } from '../types.js'
import { fromQuery } from './fromQuery.js'
import { parsePath } from './parsePath.js'
import { verifyFrame } from './verifyFrame.js'

type RequestToContextOptions = {
  hubApiUrl: string
  verify?: boolean
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
  const { initialUrl, previousState, previousIntentData } = fromQuery<
    FrameContext<string, state>
  >(request.query())

  const message = await (() => {
    if (!verify) return
    if (!trustedData) return
    return verifyFrame({
      hubApiUrl,
      frameUrl: untrustedData.url,
      trustedData,
      url: request.url,
    }).catch((err) => {
      if (verify) throw err
    })
  })()

  return {
    initialUrl: initialUrl ? initialUrl : parsePath(request.url),
    previousState,
    previousIntentData,
    frameData: untrustedData,
    status: request.method === 'POST' ? 'response' : 'initial',
    url: request.url,
    verified: Boolean(message),
  }
}
