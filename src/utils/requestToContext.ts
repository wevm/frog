import type { Context } from 'hono'
import type { FrameContext } from '../types.js'

type RequestToContextReturnType = Pick<
  FrameContext,
  'status' | 'trustedData' | 'untrustedData' | 'url'
>

export async function requestToContext(
  request: Context['req'],
): Promise<RequestToContextReturnType> {
  const { trustedData, untrustedData } =
    (await request.json().catch(() => {})) || {}

  return {
    status: request.method === 'POST' ? 'response' : 'initial',
    trustedData,
    untrustedData,
    url: request.url,
  }
}
