import { htmlToMetaTags } from './htmlToMetaTags.js'
import { parseProperties } from './parseProperties.js'

export async function getImageSize(text: string) {
  const metaTags = htmlToMetaTags(text, 'meta[property^="fc:frame:image"]')
  const properties = parseProperties(metaTags)

  const url = properties.imageUrl
  const response = await fetch(url)
  const blob = await response.blob()
  return blob.size
}
