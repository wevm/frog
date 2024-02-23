import { type Frame } from '../types.js'
import { htmlToMetaTags } from './htmlToMetaTags.js'
import { parseButtons } from './parseButtons.js'
import { parseProperties } from './parseProperties.js'

export function htmlToFrame(text: string) {
  const metaTags = htmlToMetaTags(
    text,
    'meta[property^="fc:"], meta[property^="og:"]',
  )
  const properties = parseProperties(metaTags)
  const buttons = parseButtons(metaTags)

  // TODO: Use this
  // const { buttonsAreOutOfOrder, invalidButtons } = validateButtons(buttons)

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
  } satisfies Frame
}
