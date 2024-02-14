import { type Context } from 'hono'
import { type FrameContext } from '../types.js'

type RequestToContextReturnType = Pick<
  FrameContext,
  'frameData' | 'status' | 'url'
>

export async function requestToContext(
  request: Context['req'],
): Promise<RequestToContextReturnType> {
  const { trustedData: _trustedData, untrustedData } =
    (await request.json().catch(() => {})) || {}

  return {
    frameData: untrustedData,
    status: request.method === 'POST' ? 'response' : 'initial',
    url: request.url,
  }
}
