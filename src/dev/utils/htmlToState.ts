import { type FrameContext } from '../../types.js'
import { deserializeJson } from '../../utils/deserializeJson.js'
import { type FrogMetaTagPropertyName } from '../types.js'
import { htmlToMetaTags } from './htmlToMetaTags.js'

export function htmlToState(html: string) {
  const metaTags = htmlToMetaTags(html, 'meta[property^="frog:"]')

  const properties: Partial<Record<FrogMetaTagPropertyName, string>> = {}
  for (const metaTag of metaTags) {
    const property = metaTag.getAttribute(
      'property',
    ) as FrogMetaTagPropertyName | null
    if (!property) continue

    const content = metaTag.getAttribute('content') ?? ''
    properties[property] = content
  }

  return {
    context: deserializeJson<FrameContext>(properties['frog:context']),
  }
}
