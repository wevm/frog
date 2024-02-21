import { expect, test } from 'vitest'

import { htmlToMetaTags } from './htmlToMetaTags.js'
import { parseProperties } from './parseProperties.js'

const html = `
  <meta property="fc:frame" content="vNext">

  <meta property="fc:frame:button:1" content="foo">

  <meta property="fc:frame:button:2" content="bar">
  <meta property="fc:frame:button:2:action" content="link">
  <meta property="fc:frame:button:2:target" content="https://example.com">

  <meta property="fc:frame:button:3" content="baz">
  <meta property="fc:frame:button:3:action" content="post_redirect">
  <meta property="fc:frame:button:3:target" content="https://example.com/redirect">

  <meta property="fc:frame:button:4" content="mint">
  <meta property="fc:frame:button:4:action" content="mint">
  <meta property="fc:frame:button:4:target" content="eip155:7777777:0x060f3edd18c47f59bd23d063bbeb9aa4a8fec6df">

  <meta property="fc:frame:image" content="http://example.com/image">
  <meta property="fc:frame:post_url" content="http://localhost:3001">
  <meta property="fc:frame:state" content="frog">
  <meta property="og:image" content="https://example.com/og">
`
const selector = 'meta[property^="fc:"], meta[property^="og:"]'
const metaTags = htmlToMetaTags(html, selector)

test('parseFrameProperties', () => {
  const frameProperties = parseProperties(metaTags)
  expect(frameProperties).toEqual({
    image: 'https://example.com/og',
    imageAspectRatio: '1.91:1',
    imageUrl: 'http://example.com/image',
    input: undefined,
    postUrl: 'http://localhost:3001',
    state: 'frog',
    title: '',
    version: 'vNext',
  })
})
