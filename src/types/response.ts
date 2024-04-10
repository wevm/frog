import type { ErrorFrameResponse } from './frame.js'

export type TypedResponse<
  data,
  format extends 'cast-action' | 'frame' | 'transaction',
> = format extends 'cast-action' | 'transaction'
  ? {
      data: data
      format: format
    }
  : { format: format } & (
      | {
          isErrorResponse: true
          error: ErrorFrameResponse
        }
      | {
          isErrorResponse: false
          data: data
        }
    )

export type HandlerResponse<
  typedResponse,
  format extends 'cast-action' | 'frame' | 'transaction',
> =
  | Response
  | TypedResponse<typedResponse, format>
  | Promise<Response | TypedResponse<typedResponse, format>>
