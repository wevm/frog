import type { ErrorFrameResponse } from './frame.js'

export type TypedResponse<data> =
  | {
      data: data
      format: 'cast-action' | 'transaction'
    }
  | ({ format: 'frame' } & (
      | {
          isErrorResponse: true
          error: ErrorFrameResponse
        }
      | {
          isErrorResponse: false
          data: data
        }
    ))

export type HandlerResponse<typedResponse> =
  | Response
  | TypedResponse<typedResponse>
  | Promise<Response | TypedResponse<typedResponse>>
