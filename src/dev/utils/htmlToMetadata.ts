import { parseFromString } from 'dom-parser'

import type { FrameContext } from '../../types/context.js'
import type { FrameImageAspectRatio, FrameVersion } from '../../types/frame.js'
import { deserializeJson } from '../../utils/deserializeJson.js'
import {
  type FrameMetadata,
  metaTagPropertyRegex,
} from '../../utils/getFrameMetadata.js'
import type { Frame } from '../types.js'
import { parseButtons } from './parseButtons.js'

export function htmlToMetadata(html: string) {
  const dom = parseFromString(
    html
      .replace(/<!doctype html>/i, '')
      // @TODO: consider using `lodash.unescape`
      .replaceAll(/&amp;/gm, '&')
      .replaceAll(/&lt;/gm, '<')
      .replaceAll(/&gt;/gm, '>')
      .replaceAll(/&quot;/gm, '"')
      .replaceAll(/&#39;/gm, "'")
      .replaceAll(/&#96;/gm, '`'),
  )
  const nodes = dom.getElementsByTagName('meta')

  const metadata: FrameMetadata = []
  const htmlTags = []
  const properties = {} as Record<FrameMetadata[number]['property'], string>
  for (const node of nodes) {
    const property = (node.getAttribute('property') ??
      node.getAttribute('name')) as
      | FrameMetadata[number]['property']
      | undefined
    const content = node.getAttribute('content')

    if (!property) continue
    if (!property.match(metaTagPropertyRegex)) continue
    metadata.push({ property, content })
    properties[property] = content

    // filter these properties out and add back on the client to save url space
    // tip: search for `_frog_${property}` to see where it's added back
    const excludeProperties = [
      'fc:frame:image',
      'fc:frame:post_url',
      'fc:frame:state',
      'og:image',
    ]
    let text = node.outerHTML
    if (excludeProperties.includes(property ?? ''))
      text = text.replace(/content=".*?"/, `content="_frog_${property}"`)
    htmlTags.push(text)
  }

  const buttons = parseButtons(metadata)

  return {
    context: properties['frog:context']
      ? deserializeJson<FrameContext>(properties['frog:context'])
      : undefined,
    frame: {
      buttons,
      image: properties['og:image'],
      imageAspectRatio:
        (properties['fc:frame:image:aspect_ratio'] as FrameImageAspectRatio) ??
        '1.91:1',
      imageUrl: properties['fc:frame:image'],
      input: properties['fc:frame:input:text']
        ? { text: properties['fc:frame:input:text'] }
        : undefined,
      postUrl: properties['fc:frame:post_url'] as string | undefined,
      state: properties['fc:frame:state'],
      title: properties['og:title'],
      version: (properties['fc:frame'] as FrameVersion) ?? 'vNext',

      debug: {
        htmlTags,
      },
    } satisfies Frame,
    properties: metadata,
  }
}
