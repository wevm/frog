import { getFrameMetadata as getFrameMetadata_ } from '../utils/getFrameMetadata.js'

/**
 * Extracts frame metadata from a given URL, designed to be used with Next.js' `generateMetadata` export function.
 *
 * @example
 * // app/page.tsx
 * import { getFrameMetadata } from 'frog/next'
 * import type { Metadata } from 'next'
 *
 * export async function generateMetadata(): Promise<Metadata> {
 *   const frameMetadata = await getFrameMetadata(`https://myframe.com/api`)
 *   return {
 *     other: frameMetadata,
 *   }
 * }
 */
export async function getFrameMetadata(
  url: string,
): Promise<Record<string, string>> {
  const metadata = await getFrameMetadata_(url).catch(() => {})
  if (!metadata) return {}

  const result: Record<string, string> = {}
  for (const { property, content } of metadata) result[property] = content
  return result
}
