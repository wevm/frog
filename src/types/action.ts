import type { ClientErrorStatusCode } from 'hono/utils/http-status'
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
  statusCode?: 200 | ClientErrorStatusCode | undefined
}

export type ActionResponseFn = (
  response: ActionResponse,
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
