import type { Octicon } from './octicon.js'
import type { TypedResponse } from './response.js'

export type ComposerActionOptions = {
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

export type ComposerActionResponse = {
  /**
   * URL of the form.
   *
   * @example https://example.com/form
   */
  url: string
}

export type ComposerActionResponseFn = (
  response: ComposerActionResponse,
) => TypedResponse<ComposerActionResponse>

export type ComposerActionData = {
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

export type UntrustedData = ComposerActionData
