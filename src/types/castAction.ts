import type { TypedResponse } from './response.js'

export type CastActionResponse =
  | {
      /**
       * Type of the response
       */
      type: 'message'
      /**
       * HTTP response headers.
       */
      headers?: Record<string, string> | undefined
      /**
       * Message to show in the toast.
       *
       * @example 'Action succeded!'
       */
      message: string
    }
  | {
      /**
       * Type of the response
       */
      type: 'frame'
      /**
       * Action path to the frame
       */
      action: string
    }

export type CastActionResponseFn = (
  response: CastActionResponse,
) => TypedResponse<CastActionResponse>

export type CastActionData = {
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

export type UntrustedData = CastActionData
