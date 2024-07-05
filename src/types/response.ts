import type { ClientErrorStatusCode } from 'hono/utils/http-status'
import type { OneOf } from './utils.js'

export type BaseError = { message: string; statusCode?: ClientErrorStatusCode }

export type BaseErrorResponseFn = (response: BaseError) => TypedResponse<never>

export type TypedResponse<data> = {
  format:
    | 'castAction'
    | 'composerAction'
    | 'frame'
    | 'transaction'
    | 'image'
    | 'signature'
} & OneOf<
  { data: data; status: 'success' } | { error: BaseError; status: 'error' }
>

export type HandlerResponse<typedResponse> =
  | Response
  | TypedResponse<typedResponse>
  | Promise<Response | TypedResponse<typedResponse>>
