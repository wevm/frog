import { type Frame } from '../types.js'
import { htmlToMetaTags } from './htmlToMetaTags.js'
import { parseButtons } from './parseButtons.js'
import { parseProperties } from './parseProperties.js'
import { validateButtons } from './validateButtons.js'

export function htmlToFrame(html: string) {
  const metaTags = htmlToMetaTags(
    html,
    'meta[property^="fc:"], meta[property^="og:"]',
  )
  const properties = parseProperties(metaTags)
  const buttons = parseButtons(metaTags)

  const fallbackImageToUrl = !properties.imageUrl
  const postUrlTooLong = properties.postUrl.length > 256
  const inputTextTooLong = properties.input?.text
    ? properties.input.text.length > 32
    : false
  const stateTooLong = properties.state.length > 4_096

  const { buttonsAreOutOfOrder, invalidButtons } = validateButtons(buttons)

  // TODO: Figure out how this is determined
  // https://warpcast.com/~/developers/frames
  const valid = !(
    postUrlTooLong ||
    inputTextTooLong ||
    stateTooLong ||
    Boolean(invalidButtons.length)
  )

  const frame = {
    buttons,
    imageAspectRatio: properties.imageAspectRatio,
    imageUrl: properties.imageUrl,
    input: properties.input,
    postUrl: properties.postUrl,
    state: properties.state,
    version: properties.version,
  }

  return {
    ...frame,
    debug: {
      ...frame,
      buttonsAreOutOfOrder,
      fallbackImageToUrl,
      htmlTags: metaTags.map((x) => x.outerHTML),
      image: properties.image,
      inputTextTooLong,
      invalidButtons,
      postUrlTooLong,
      stateTooLong,
      valid,
    },
    title: properties.title,
  } satisfies Frame
}
