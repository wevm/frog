import type { TrustedData } from './frame.js'

export type Hub = {
  /** Hub API URL. */
  apiUrl: string
  /** Options to pass to `fetch`. */
  fetchOptions?: RequestInit
  /** Verify frame override. */
  verifyMessage?: (parameters: { trustedData: TrustedData }) => Promise<void>
}
