// TODO: TSDoc

import { type Context, type Env } from 'hono'

export type FrameContext<path extends string = string, state = unknown> = {
  buttonValue?: string | undefined
  deriveState: (fn?: (state: state) => void) => state
  frameData: FrameData
  inputText?: string | undefined
  previousState: state
  request: Context<Env, path>['req']
  /**
   * Status of the frame in the frame lifecycle.
   * - `initial` - The frame has not yet been interacted with.
   * - `redirect` - The frame interaction is a redirect (button of type `'post_redirect'`).
   * - `response` - The frame has been interacted with (user presses button).
   */
  status: 'initial' | 'redirect' | 'response'
  url: Context['req']['url']
}

export type PreviousFrameContext<state = unknown> = {
  /** Intent data from the previous frame. */
  intentData: readonly Record<string, string>[]
  previousState: state
}

export type FrameData = {
  buttonIndex?: 1 | 2 | 3 | 4 | undefined
  castId: { fid: number; hash: string }
  fid: number
  inputText?: string | undefined
  messageHash: string
  network: number
  timestamp: number
  url: string
}

export type FrameImageAspectRatio = '1.91:1' | '1:1'

export type FrameVersion = 'vNext'

export type FrameIntent = JSX.Element | false | null | undefined
export type FrameIntents = FrameIntent | FrameIntent[]

export type FrameIntentData = Record<string, string>

export type TrustedData = {
  messageBytes: string
}

export type UntrustedData = FrameData

export type Pretty<type> = { [key in keyof type]: type[key] } & unknown
