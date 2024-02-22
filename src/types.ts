import { type Context, type Env } from 'hono'

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
   * Initial URL of the frame set.
   */
  initialUrl: string
  /**
   * Input text from the previous frame.
   */
  inputText?: string | undefined
  /**
   * Intent data from the previous frame.
   */
  previousIntentData?: FrameIntentData[] | undefined
  /**
   * State from the previous frame.
   */
  previousState: state
  request: Context<Env, path>['req']
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

export type FrameIntentData = string

export type TrustedData = {
  messageBytes: string
}

export type UntrustedData = FrameData

export type Pretty<type> = { [key in keyof type]: type[key] } & unknown
