import { type Frame } from '../types.js'
import { htmlToMetaTags } from './htmlToMetaTags.js'
import { parseButtons } from './parseButtons.js'
import { parseProperties } from './parseProperties.js'
import { validateButtons } from './validateButtons.js'

export function htmlToFrame(text: string, imageSize?: number) {
  const metaTags = htmlToMetaTags(
    text,
    'meta[property^="fc:"], meta[property^="og:"]',
  )
  const properties = parseProperties(metaTags)
  const buttons = parseButtons(metaTags)

  const limits = {
    postUrl: 256,
    inputText: 32,
    state: 4_096,
    image: 256,
  }

  const fallbackImageToUrl = !properties.imageUrl
  const postUrlTooLong = properties.postUrl.length > limits.postUrl
  const inputTextTooLong = properties.input?.text
    ? properties.input.text.length > limits.inputText
    : false
  const stateTooLong = properties.state.length > limits.state
  const imageTooLarge = imageSize ? imageSize / 1024 > limits.image : false

  const { buttonsAreOutOfOrder, invalidButtons } = validateButtons(buttons)

  // TODO: Figure out how this is determined
  // https://warpcast.com/~/developers/frames
  const valid = !(
    postUrlTooLong ||
    inputTextTooLong ||
    stateTooLong ||
    imageTooLarge ||
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

  const validations = [
    {
      property: 'fc:frame',
      value: frame.version,
      status: frame.version === 'vNext' ? 'valid' : 'invalid',
      message: `Version is ${frame.version} and must be vNext.`,
    },
    {
      property: 'fc:frame:image',
      value: frame.imageUrl,
      status: imageTooLarge ? 'invalid' : 'valid',
      message: `Image is ${((imageSize ?? 1024) / 1024).toFixed(
        2,
      )} kilobytes and must be ${limits.image.toLocaleString()} kilobytes or less.`,
    },
    {
      property: 'fc:frame:aspect_ratio',
      value: frame.imageAspectRatio,
      status: 'valid',
    },
    {
      property: 'fc:frame:post_url',
      value: frame.postUrl,
      status: postUrlTooLong ? 'invalid' : 'valid',
      message: `Post URL is ${
        frame.postUrl.length
      } bytes and must be ${limits.postUrl.toLocaleString()} bytes or less.`,
    },
    {
      property: 'fc:frame:state',
      value: decodeURIComponent(frame.state),
      status: stateTooLong ? 'invalid' : 'valid',
      message: `State is ${
        frame.state.length
      } bytes and must be ${limits.state.toLocaleString()} bytes or less.`,
    },
    {
      property: 'og:image',
      value: properties.image,
      status: 'valid',
    },
    ...((frame.input?.text
      ? [
          {
            property: 'fc:frame:input:text',
            value: frame.input.text,
            status: inputTextTooLong ? 'invalid' : 'valid',
            message: `Input text is ${
              frame.input.text.length
            } bytes and must be ${limits.inputText.toLocaleString()} bytes or less. Keep in mind non-ASCII characters, like emoji, can take up more than 1 byte of space.`,
          },
        ]
      : []) as NonNullable<Frame['debug']>['validations']),
    ...(buttons.map((button) => ({
      property: `fc:frame:button:${button.index}`,
      value: `${button.title}${button.type ? `, ${button.type}` : ''}${
        button.target ? `, ${button.target}` : ''
      }`,
      status: 'valid',
    })) as NonNullable<Frame['debug']>['validations']),
  ] as const

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
      validations,
    },
    title: properties.title,
  } satisfies Frame
}
