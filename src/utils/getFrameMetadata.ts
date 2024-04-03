import { parseFromString } from 'dom-parser'

export type FrameMetadata = {
  property: FrameMetaTagPropertyName | FrogMetaTagPropertyName
  content: string
}[]

type FrameMetaTagPropertyName =
  | 'fc:frame'
  | 'fc:frame:image'
  | 'fc:frame:image:aspect_ratio'
  | 'fc:frame:input:text'
  | 'fc:frame:post_url'
  | 'fc:frame:state'
  | 'og:image'
  | 'og:title'
  | `fc:frame:button:${1 | 2 | 3 | 4}`
  | `fc:frame:button:${1 | 2 | 3 | 4}:${'action' | 'target'}`

type FrogMetaTagPropertyName =
  | 'frog:context'
  | 'frog:image'
  | 'frog:prev_context'
  | 'frog:version'

export const metaTagPropertyRegex = /^(fc|frog|og:image|og:title)/

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

    const dom = parseFromString(text.replace(/<!doctype html>/i, ''))
    const nodes = dom.getElementsByTagName('meta')

    const metaTags: FrameMetadata = []
    for (const node of nodes) {
      const property = node.getAttribute('property')
      const content = node.getAttribute('content')

      if (!property.match(metaTagPropertyRegex)) continue
      metaTags.push({
        property: property as FrameMetadata[number]['property'],
        content,
      })
    }

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
