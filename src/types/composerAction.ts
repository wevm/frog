import type { TypedResponse } from './response.js'

export type ComposerActionResponse = {
  /**
   * Title of the action.
   */
  title: string
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
  state: {
    requestId: string
    cast: {
      parent?: string | undefined
      text: string
      embeds: string[]
      castDistribution: string
    }
  }
}

export type TrustedData = {
  messageBytes: string
}

export type UntrustedData = ComposerActionData
