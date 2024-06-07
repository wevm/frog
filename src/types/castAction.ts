import type { Octicon } from './octicon.js'
import type { TypedResponse } from './response.js'

export type CastActionOptions = {
  /**
   * An action name up to 30 characters.
   *
   * @example `'My action.'`
   */
  name: string
  /**
   * An icon ID.
   *
   * @see https://warpcast.notion.site/Spec-Farcaster-Actions-84d5a85d479a43139ea883f6823d8caa
   * @example `'log'`
   */
  icon: Octicon
  /**
   * A short description up to 80 characters.
   *
   * @example `'My awesome action description.'`
   */
  description?: string
  /**
   * Optional external link to an "about" page.
   * You should only include this if you can't fully describe your
   * action using the `description` field.
   * Must be http or https protocol.
   *
   * @example `'My awesome action description.'`
   */
  aboutUrl?: string
}

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
