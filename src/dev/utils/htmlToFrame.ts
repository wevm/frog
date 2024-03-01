import { type Frame } from '../types.js'
import { htmlToMetaTags } from './htmlToMetaTags.js'
import { parseButtons } from './parseButtons.js'
import { parseProperties } from './parseProperties.js'
import { validateButtons } from './validateButtons.js'

export function htmlToFrame(text: string) {
  const metaTags = htmlToMetaTags(
    text,
    'meta[property^="fc:"], meta[property^="og:"]',
  )
  const properties = parseProperties(metaTags)
  const buttons = parseButtons(metaTags)

  const { buttonsAreOutOfOrder, invalidButtons } = validateButtons(buttons)

  const htmlTags = []
  for (const metaTag of metaTags) {
    const property = metaTag.getAttribute('property')
    // filter these properties out and add back on the client to save url space
    // tip: search for `_frog_${property}` to see where it's added back
    const excludeProperties = [
      'fc:frame:image',
      'fc:frame:post_url',
      'fc:frame:state',
      'og:image',
    ]
    if (excludeProperties.includes(property ?? '')) {
      metaTag.setAttribute('content', `_frog_${property}`)
    }
    htmlTags.push(metaTag.outerHTML)
  }

  return {
    buttons,
    image: properties.image,
    imageAspectRatio: properties.imageAspectRatio,
    imageUrl: properties.imageUrl,
    input: properties.input,
    postUrl: properties.postUrl,
    state: properties.state,
    title: properties.title,
    version: properties.version,

    debug: {
      buttonsAreOutOfOrder,
      htmlTags,
      invalidButtons,
      state: undefined,
    },
  } satisfies Frame
}
