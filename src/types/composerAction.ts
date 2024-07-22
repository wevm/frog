import type { CastActionOptions } from './castAction.js'
import type { TypedResponse } from './response.js'

export type ComposerActionOptions = {
  /**
   * Optional external link to an "about" page.
   * You should only include this if you can't fully describe your
   * action using the `description` field.
   * Must be http or https protocol.
   *
   * @example `'https://somewhere.com'`
   */
  aboutUrl?: CastActionOptions['aboutUrl']
  /**
   * A short description up to 20 characters.
   *
   * @example `'My awesome action description.'`
   */
  description: NonNullable<CastActionOptions['description']>
  icon: CastActionOptions['icon']
  /**
   * Remote image URL.
   *
   * @example `'https://somewhere.com/image.png'`
   */
  imageUrl: string
  /**
   * An action name up to 14 characters.
   *
   * @example `'My action.'`
   */
  name: CastActionOptions['name']
}

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
