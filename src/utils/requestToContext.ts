import type { Context } from 'hono'
import type { FrameContext } from '../types.js'
import { fromQuery } from './fromQuery.js'
import { parsePath } from './parsePath.js'

type RequestToContextReturnType<state = unknown> = Pick<
  FrameContext<string, state>,
  | 'initialUrl'
  | 'previousState'
  | 'previousIntentData'
  | 'frameData'
  | 'status'
  | 'url'
>

export async function requestToContext<state>(
  request: Context['req'],
): Promise<RequestToContextReturnType<state>> {
  const { trustedData: _trustedData, untrustedData } =
    (await request.json().catch(() => {})) || {}
  const { initialUrl, previousState, previousIntentData } = fromQuery<
    FrameContext<string, state>
  >(request.query())

  return {
    initialUrl: initialUrl ? initialUrl : parsePath(request.url),
    previousState,
    previousIntentData,
    frameData: untrustedData,
    status: request.method === 'POST' ? 'response' : 'initial',
    url: request.url,
  }
}
