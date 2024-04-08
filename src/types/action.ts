import type {
  ClientErrorStatusCode,
  SuccessStatusCode,
} from 'hono/utils/http-status'
import type { TypedResponse } from './response.js'

export type ActionResponse = {
  /**
   * HTTP response headers.
   */
  headers?: Record<string, string> | undefined
  /**
   * Message to show in the toast
   *
   * @example 'Action succeded!'
   */
  message: string
  /**
   * HTTP Status code to send the message with.
   *
   * Should match either 200 or 4xx status code.
   *
   * @example 200
   */
  statusCode: Extract<SuccessStatusCode, 200> | ClientErrorStatusCode
}

export type ActionResponseFn = (
  response: ActionResponse,
) => TypedResponse<ActionResponse>

//////////////////////////////////////////////////////
// Message Response

export type MessageActionParameters = string
export type MessageActionResponseFn = (
  message: MessageActionParameters,
) => TypedResponse<ActionResponse>

//////////////////////////////////////////////////////
// Error Response

export type ErrorActionParameters = {
  message: string
  statusCode: Exclude<ActionResponse['statusCode'], 200>
}
export type ErrorActionResponseFn = (
  parameters: ErrorActionParameters,
) => TypedResponse<ActionResponse>

export type ActionData = {
  buttonIndex: 1
  castId: { fid: number; hash: string }
  fid: number
  messageHash: string
  network: number
  timestamp: number
  url: string
}

export type TrustedData = {
  messageBytes: string
}

export type UntrustedData = ActionData
