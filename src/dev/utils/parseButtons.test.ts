import { parseFromString } from 'dom-parser'
import { expect, test } from 'vitest'

import type { FrameMetadata } from '../../utils/getFrameMetadata.js'
import { parseButtons } from './parseButtons.js'

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

const dom = parseFromString(html)
const nodes = dom.getElementsByTagName('meta')
const metadata: FrameMetadata = []
for (const node of nodes) {
  const property = node.getAttribute(
    'property',
  ) as FrameMetadata[number]['property']
  const content = node.getAttribute('content')
  metadata.push({ property, content })
}

test('default', () => {
  const buttons = parseButtons(metadata)
  expect(buttons).toEqual([
    {
      title: 'foo',
      index: 1,
      type: 'post',
    },
    {
      title: 'bar',
      index: 2,
      target: 'https://example.com',
      type: 'link',
    },
    {
      title: 'baz',
      index: 3,
      target: 'https://example.com/redirect',
      type: 'post_redirect',
    },
    {
      title: 'mint',
      index: 4,
      target: 'eip155:7777777:0x060f3edd18c47f59bd23d063bbeb9aa4a8fec6df',
      type: 'mint',
    },
  ])
})
