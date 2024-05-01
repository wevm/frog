import type { VerifyFrameParameters } from '../utils/verifyFrame.js'

export type Hub = {
  /** Hub API URL. */
  apiUrl: string
  /** Options to pass to `fetch`. */
  fetchOptions?: RequestInit
  /** Verify a frame. */
  verifyFrame?: ({
    frameUrl,
    hub,
    trustedData,
    body,
    url,
  }: VerifyFrameParameters & { body: Uint8Array }) => Promise<{
    frameData: any
  }>
}
