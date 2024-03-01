import { type Context, type Env } from 'hono'
import { type ImageResponseOptions } from 'hono-og'

export type FrameContext<path extends string = string, state = unknown> = {
  /**
   * Index of the button that was interacted with on the previous frame.
   */
  buttonIndex?: FrameData['buttonIndex']
  /**
   * Value of the button that was interacted with on the previous frame.
   */
  buttonValue?: string | undefined
  /**
   * Function to derive the frame's state based off the state from the
   * previous frame.
   */
  deriveState: (fn?: (previousState: state) => void) => state
  /**
   * Data from the frame that was passed via the POST body.
   * The {@link FrameContext`verified`} flag indicates whether the data is trusted or not.
   */
  frameData?: Pretty<FrameData>
  /**
   * Initial path of the frame set.
   */
  initialPath: string
  /**
   * Input text from the previous frame.
   */
  inputText?: string | undefined
  /**
   * Button values from the previous frame.
   */
  previousButtonValues?: FrameButtonValue[] | undefined
  /**
   * State from the previous frame.
   */
  previousState: state
  /** Frame request object. */
  req: Context<Env, path>['req']
  /** Frame response that includes frame properties such as: image, intents, action, etc */
  res: FrameResponseFn
  /**
   * Status of the frame in the frame lifecycle.
   * - `initial` - The frame has not yet been interacted with.
   * - `redirect` - The frame interaction is a redirect (button of type `'post_redirect'`).
   * - `response` - The frame has been interacted with (user presses button).
   */
  status: 'initial' | 'redirect' | 'response'
  /**
   * Whether or not the {@link FrameContext`frameData`} was verified by the Farcaster Hub API.
   */
  verified: boolean
  /**
   * URL of the frame.
   */
  url: Context['req']['url']
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
   * The OG Image to render for the frame. Can either be a JSX element, or URL.
   *
   * @example
   * <div style={{ fontSize: 60 }}>Hello Frog</div>
   *
   * @example
   * "https://i.ytimg.com/vi/R3UACX5eULI/maxresdefault.jpg"
   */
  image: string | JSX.Element
  /**
   * The aspect ratio of the OG Image.
   *
   * @example '1:1'
   */
  imageAspectRatio?: FrameImageAspectRatio | undefined
  /**
   * Image options.
   *
   * @see https://vercel.com/docs/functions/og-image-generation/og-image-api
   *
   * @example
   * { width: 1200, height: 630 }
   */
  imageOptions?: ImageResponseOptions | undefined
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
  intents?: FrameIntents | undefined
  /**
   * Title of the frame (added as `og:title`).
   *
   * @example 'Hello Frog'
   */
  title?: string | undefined
}

export type FrameResponseFn = (
  response: FrameResponse,
) => TypedResponse<FrameResponse>

export type FrameData = {
  buttonIndex?: 1 | 2 | 3 | 4 | undefined
  castId: { fid: number; hash: string }
  fid: number
  inputText?: string | undefined
  messageHash: string
  network: number
  state?: string | undefined
  timestamp: number
  url: string
}

export type FrameImageAspectRatio = '1.91:1' | '1:1'

export type FrameVersion = 'vNext'

export type FrameIntent = JSX.Element | false | null | undefined
export type FrameIntents = FrameIntent | FrameIntent[]

export type FrameButtonValue = string

export type TrustedData = {
  messageBytes: string
}

export type TypedResponse<data> = {
  data: data
  format: 'frame'
}

export type HandlerResponse<typedResponse> =
  | Response
  | TypedResponse<typedResponse>
  | Promise<Response>
  | Promise<TypedResponse<typedResponse>>

export type UntrustedData = FrameData

export type Pretty<type> = { [key in keyof type]: type[key] } & unknown
