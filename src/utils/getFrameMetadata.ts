import type { FrameMetaTagPropertyName } from '../dev/types.js'

export type FrameMetadata = {
  property: FrameMetaTagPropertyName
  content: string
}[]

/**
 * Extracts frame metadata from a given URL.
 *
 * @example
 * import { getFrameMetadata } from 'frog'
 * const frameMetadata = await getFrameMetadata(`https://myframe.com/api`)
 */
export async function getFrameMetadata(url: string): Promise<FrameMetadata> {
  try {
    const text = await fetch(url).then((r) => r.text())

    const match = text.matchAll(
      /<meta property="(fc|frog):(\S+)" content="(\S+)"/gm,
    )
    if (!match) return []

    const metaTags: FrameMetadata = []
    for (const [_, prefix, key, value] of match)
      metaTags.push({
        property: `${prefix}:${key}` as FrameMetaTagPropertyName,
        content: value,
      })

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
