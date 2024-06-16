import type { ImageResponseOptions } from 'hono-og'
import type { JSX } from 'hono/jsx/jsx-runtime'
import type { Hash } from 'viem'
import type { TypedResponse } from './response.js'
import type { Pretty } from './utils.js'

export type Font = {
  name: string
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
  style?: 'normal' | 'italic'
  lang?: string
} & (
  | { data: ArrayBuffer | Buffer; source?: 'buffer' | undefined }
  | { source: 'google' }
)

export type ImageOptions = Omit<
  ImageResponseOptions,
  'fonts' | 'tailwindConfig'
> & {
  fonts?: Font[] | undefined
}

export type FrameResponse = {
  /**
   * Path of the next frame.
   *
   * @example '/submit'
   */
  action?: string | undefined
  /**
   * Location (URL or path relative to `basePath`) to redirect to when the user
   * is coming to the page via a browser.
   *
   * For instance, a user may reach the frame page in their
   * browser by clicking on the link beneath the frame on Warpcast.
   * We may want to redirect them to a different page (ie. a mint page, etc)
   * when they arrive via their browser.
   *
   * @example (Absolute Path)
   * Parameters:
   *   basePath: '/api'
   *   browserLocation: '/'
   *
   * https://example.com/api -> https://example.com/
   * https://example.com/api/foo -> https://example.com/
   *
   * @example (Absolute Path)
   * Parameters:
   *   basePath: '/api'
   *   browserLocation: '/mint'
   *
   * https://example.com/api -> https://example.com/mint
   * https://example.com/api/foo -> https://example.com/mint
   *
   * @example (Absolute Path with `:path` template)
   * Parameters
   *   basePath: '/api'
   *   browserLocation: '/:path'
   *
   * https://example.com/api -> https://example.com/
   * https://example.com/api/foo -> https://example.com/foo
   * https://example.com/api/foo/bar -> https://example.com/foo/bar
   *
   * @example (Relative Path)
   * Parameters:
   *   basePath: '/api'
   *   browserLocation: './dev'
   *
   * https://example.com/api -> https://example.com/api/dev
   * https://example.com/api/foo -> https://example.com/api/foo/dev
   *
   * @example (URL)
   * Parameters:
   *   browserLocation: 'https://google.com/:path'
   *
   * https://example.com/api -> https://google.com/api
   * https://example.com/api/foo -> https://google.com/api/foo
   */
  browserLocation?: string | undefined
  /**
   * HTTP response headers.
   */
  headers?: Record<string, string> | undefined
  /**
   * The aspect ratio of the OG Image.
   *
   * @example '1:1'
   */
  imageAspectRatio?: FrameImageAspectRatio | undefined
  /**
   * Path or URI to the OG image.
   *
   * @default The `image` property.
   */
  ogImage?: string | undefined
  /**
   * A set of intents (ie. buttons, text inputs, etc) to render for the frame
   * (beneath the OG image).
   *
   * @example
   * intents: [
   *   <TextInput placeholder="Enter your favourite food..." />,
   *   <Button>Submit</Button>,
   * ]
   */
  intents?: FrameIntent | FrameIntent[] | undefined
  /**
   * Title of the frame (added as `og:title`).
   *
   * @example 'Hello Frog'
   */
  title?: string | undefined
  /**
   * Additional meta tags for the frame.
   */
  unstable_metaTags?: { property: string; content: string }[] | undefined
} & (
  | {
      /**
       * The OG Image to render for the frame. Can either be a JSX element, or URL.
       *
       * @example
       * <div style={{ fontSize: 60 }}>Hello Frog</div>
       */
      image: JSX.Element
      /**
       * Image options.
       *
       * @see https://vercel.com/docs/functions/og-image-generation/og-image-api
       *
       * @example
       * { width: 1200, height: 630 }
       */
      imageOptions?: Pretty<Omit<ImageOptions, 'fonts'>> | undefined
    }
  | {
      /**
       * The OG Image to render for the frame. Can either be a JSX element, or URL.
       *
       * @example
       * "https://i.ytimg.com/vi/R3UACX5eULI/maxresdefault.jpg"
       */
      image: string
      imageOptions?: never
    }
)

export type FrameResponseFn = (
  response: FrameResponse,
) => TypedResponse<FrameResponse>

export type FrameData = {
  address?: string | undefined
  buttonIndex?: 1 | 2 | 3 | 4 | undefined
  castId: { fid: number; hash: string }
  fid: number
  inputText?: string | undefined
  messageHash: string
  network: number
  state?: string | undefined
  timestamp: number
  transactionId?: Hash | undefined
  url: string
}

export type FrameImageAspectRatio = '1.91:1' | '1:1'

export type FrameVersion = 'vNext'

export type FrameIntent = JSX.Element | JSX.Element[] | false | null | undefined
/** @deprecated */
export type FrameIntents = FrameIntent | FrameIntent[]

export type FrameButtonValue = string

export type TrustedData = {
  messageBytes: string
}

export type UntrustedData = FrameData
