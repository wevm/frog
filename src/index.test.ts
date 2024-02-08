import { describe, expect, test } from 'vitest'

import {
  htmlToMetaTags,
  parseFrameButtons,
  parseFrameProperties,
  validateFrameButtons,
} from './index.tsx'

const html = `
  <meta property="fc:frame" content="vNext">
  <meta property="fc:frame:button:1" content="foo">
  <meta property="fc:frame:button:2" content="bar">
  <meta property="fc:frame:button:3" content="baz">
  <meta property="fc:frame:button:3:action" content="post_redirect">
  <meta property="fc:frame:image" content="http://example.com/image">
  <meta property="fc:frame:post_url" content="http://localhost:3001">
  <meta property="og:image" content="https://example.com/og">
`
const metaTags = htmlToMetaTags(html)

test('htmlToMetaTags', () => {
  const html = `
    <title>foo</title>
    <meta property="fc:frame" content="vNext">
    <meta property="og:image" content="https://example.com/og">
    <foo>bar</foo>
  `
  expect(htmlToMetaTags(html).length).toEqual(2)
})

test('parseFrameProperties', () => {
  const frameProperties = parseFrameProperties(metaTags)
  expect(frameProperties).toEqual({
    image: 'https://example.com/og',
    imageAspectRatio: '1.91:1',
    imageUrl: 'http://example.com/image',
    input: undefined,
    postUrl: 'http://localhost:3001',
    title: '',
    version: 'vNext',
  })
})

describe('parseFrameButtons', () => {
  test('default', () => {
    const buttons = parseFrameButtons(metaTags)
    expect(buttons).toEqual([
      {
        title: 'foo',
        index: 1,
        type: 'post',
      },
      {
        title: 'bar',
        index: 2,
        type: 'post',
      },
      {
        title: 'baz',
        index: 3,
        type: 'post_redirect',
      },
    ])
  })
})

describe('validateFrameButtons', () => {
  test('default', () => {
    const buttons = parseFrameButtons(metaTags)
    const result = validateFrameButtons(buttons)
    expect(result).toEqual({
      buttonsAreOutOfOrder: false,
      invalidButtons: [],
    })
  })

  test('missing buttons', () => {
    const html = `
      <meta property="fc:frame:button:2" content="bar">
      <meta property="fc:frame:button:3" content="baz">
    `
    const metaTags = htmlToMetaTags(html)
    const buttons = parseFrameButtons(metaTags)
    const result = validateFrameButtons(buttons)
    expect(result).toEqual({
      buttonsAreOutOfOrder: true,
      invalidButtons: [],
    })
  })

  test('missing buttons', () => {
    const html = `
      <meta property="fc:frame:button:1" content="foo">
      <meta property="fc:frame:button:3" content="baz">
    `
    const metaTags = htmlToMetaTags(html)
    const buttons = parseFrameButtons(metaTags)
    const result = validateFrameButtons(buttons)
    expect(result).toEqual({
      buttonsAreOutOfOrder: true,
      invalidButtons: [],
    })
  })
})
