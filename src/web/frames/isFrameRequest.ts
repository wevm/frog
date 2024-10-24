/**
 * Detects if request has `FCBot` set in the `User-Agent` which tells that request is being done from a frame.
 *
 * @example
 * import { Suspense } from 'react'
 * import { headers } from 'next/headers'
 * import { isFrameRequest } from 'frog/next'
 *
 * export default function Page() {
 *   if (isFrameRequest(headers())) return null
 *
 *   return (
 *     <Suspense fallback={<>Loading</>}>
 *       <SuspendingCompoenent />
 *     </Suspense>
 *   )
 *  }
 * }
 */
export function isFrameRequest(headers: Headers) {
  return /FCBot/.test(headers.get('User-Agent') ?? '') ?? false
}
