import type { TypedResponse } from './response.js'

export type FrameV2Response = {
  /**
   * Frame action options.
   */
  action: {
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
    url: string
    /**
     * 200x200px splash image URL. Must be less than 1MB.
     *
     * @example "https://yoink.party/img/splash.png"
     */
    splashImageUrl: string
    /**
     * App Splash Image Background Color.
     *
     * @example '#000'
     */
    splashBackgroundColor: `#${string}`
  }
  /**
   * Title of the button.
   *
   * @example 'Yoink!'
   */
  buttonTitle: string
  /**
   * HTTP response headers.
   */
  headers?: Record<string, string> | undefined
  /**
   * Path or URI to the OG image.
   *
   * @default The `image` property.
   */
  ogImage?: string | undefined
  /**
   * Title of the frame (added as `og:title`).
   *
   * @example 'Hello Frog'
   */
  ogTitle?: string | undefined
  /**
   * Additional meta tags for the frame.
   */
  unstable_metaTags?: { property: string; content: string }[] | undefined
  /**
   * Frame image. Must be 3:2 aspect ratio. Must be less than 10 MB.
   *
   *
   * @example "https://yoink.party/img/start.png"
   * @example "/image-1"
   */
  image: string
}

export type FrameV2ResponseFn = (
  response: FrameV2Response,
) => TypedResponse<FrameV2Response>
