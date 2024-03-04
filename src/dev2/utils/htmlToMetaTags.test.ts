import { expect, test } from 'vitest'

import { htmlToMetaTags } from './htmlToMetaTags.js'

const selector = 'meta[property^="fc:"], meta[property^="og:"]'

test('htmlToMetaTags', () => {
  const html = `
    <title>foo</title>
    <meta property="fc:frame" content="vNext">
    <meta property="og:image" content="https://example.com/og">
    <foo>bar</foo>
  `
  expect(htmlToMetaTags(html, selector).length).toEqual(2)
})
