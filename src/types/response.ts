import type { ErrorTransactionResponse } from './transaction.js'

export type TypedResponse<data> =
  | {
      data: data
      format: 'cast-action' | 'frame'
    }
  | ({ format: 'transaction' } & (
      | {
          isErrorResponse: true
          error: ErrorTransactionResponse
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
