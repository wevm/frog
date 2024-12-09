export type TriggerConfig = {
  /**
   * Type of trigger, either cast or composer. Required.
   */
  type: 'cast' | 'composer'

  /**
   * Unique ID. Required. Reported to the frame.
   * @example 'yoink-score'
   */
  id: string

  /**
   * Handler URL. Required.
   * @example 'https://yoink.party/triggers/cast'
   */
  url: string

  /**
   * Name override. Optional, defaults to {@link FrameConfig`name`}
   * @example 'View Yoink Score'
   */
  name?: string | undefined
}
export type FrameConfig = {
  /**
   * Manifest version. Required.
   *
   * @example "0.0.0"
   */
  version: string

  /**
   * App name. Required.
   *
   * @example "Yoink!"
   */
  name: string

  /**
   * Default launch URL. Required
   *
   * @example "https://yoink.party/"
   */
  homeUrl: string

  /**
   * 200x200px frame application icon URL. Must be less than 1MB.
   *
   * @example "https://yoink.party/img/icon.png"
   */
  iconUrl: string

  /**
   * 200x200px splash image URL. Must be less than 1MB.
   *
   * @example "https://yoink.party/img/splash.png"
   */
  splashImageUrl?: string | undefined

  /**
   * Hex color code.
   *
   * @example "#eeeee4"
   */
  splashBackgroundColor?: string | undefined

  /**
   * URL to which clients will POST events.
   * Required if the frame application uses notifications.
   *
   * @example "https://yoink.party/webhook"
   */
  webhookUrl?: string | undefined
}
export type FarcasterManifest = {
  /**
   * Metadata associating the domain with a Farcaster account
   */
  accountAssociation: {
    /**
     * base64url encoded JFS header.
     * See FIP: JSON Farcaster Signatures for details on this format.
     */
    header: string
    /**
     * base64url encoded payload containing a single property `domain`
     */
    payload: string

    /**
     * base64url encoded signature bytes
     */
    signature: string
  }

  /**
   * Frame configuration
   */
  frame: FrameConfig

  /**
   * Trigger Configuration
   */
  triggers?: TriggerConfig[] | undefined
}

/**
 * This method is basicaly a no-op but good to have in case if
 * folks haven't heard of `satisfies` keyword.
 *
 * You can simply use `{} satisfies FarcasterManifest` to achieve the same outcome.
 */
export function buildFarcasterManifest(
  manifest: FarcasterManifest,
): FarcasterManifest {
  return manifest
}
