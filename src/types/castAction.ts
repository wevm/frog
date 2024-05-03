import type { TypedResponse } from './response.js'

export type CastActionFrameResponse = {
  /**
   * Path to the frame.
   *
   * @example '/my-frame'
   */
  path: string
}

export type CastActionFrameResponseFn = (
  response: CastActionFrameResponse,
) => TypedResponse<CastActionResponse>

export type CastActionMessageResponse = {
  /**
   * Message to show in the toast.
   *
   * @example 'Action succeded!'
   */
  message: string
  /**
   * If present, clients must display the message as an external link to this URL.
   */
  link?: string | undefined
}

export type CastActionMessageResponseFn = (
  response: CastActionMessageResponse,
) => TypedResponse<CastActionResponse>

export type CastActionResponse =
  | ({
      /**
       * Type of the response
       */
      type: 'message'
    } & CastActionMessageResponse)
  | ({
      /**
       * Type of the response
       */
      type: 'frame'
    } & CastActionFrameResponse)

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
