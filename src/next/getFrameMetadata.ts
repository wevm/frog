/**
 * Extracts frame metadata from a given URL, designed to be used with Next.js' `generateMetadata` export function.
 *
 * @example
 * // app/page.tsx
 * import { getFrameMetadata } from 'frog'
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
  try {
    const text = await fetch(url).then((r) => r.text())

    const match = text.matchAll(
      /<meta property="(fc|frog):(\S+)" content="(\S+)"/gm,
    )
    if (!match) return {}

    const metaTags: Record<string, string> = {}
    for (const [_, prefix, key, value] of match)
      metaTags[`${prefix}:${key}`] = value

    return metaTags
  } catch (error) {
    throw new Error(
      [
        `Failed to extract frame meta tags from "${url}".`,
        '',
        `Error: ${error}`,
      ].join('\n'),
    )
  }
}
