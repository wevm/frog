import type { JSX } from 'hono/jsx/jsx-runtime'
import type { ImageOptions } from './frame.js'
import type { TypedResponse } from './response.js'

export type ImageResponse = {
  /**
   * HTTP response headers.
   */
  headers?: Record<string, string> | undefined
  /**
   * The OG Image to render for the frame.
   *
   * @example
   * <div style={{ fontSize: 60 }}>Hello Frog</div>
   *
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
  imageOptions?: ImageOptions | undefined
}

export type ImageResponseFn = (
  response: ImageResponse,
) => TypedResponse<ImageResponse>
