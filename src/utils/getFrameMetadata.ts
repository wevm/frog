import { parseFromString } from 'dom-parser'
import type {
  FrameMetaTagPropertyName,
  FrogMetaTagPropertyName,
} from '../dev/types.js'

export type FrameMetadata = {
  property: FrameMetaTagPropertyName | FrogMetaTagPropertyName
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

    const dom = parseFromString(text.replace('<!DOCTYPE html>', ''))
    const nodes = dom.getElementsByTagName('meta')

    const metaTags: FrameMetadata = []
    for (const node of nodes) {
      const property = node.getAttribute('property')
      const content = node.getAttribute('content')

      if (!property.match(/^(fc|frog|og:image)/)) continue
      metaTags.push({ property: property as FrameMetaTagPropertyName, content })
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
