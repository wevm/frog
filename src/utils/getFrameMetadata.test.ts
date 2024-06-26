import { expect, test } from 'vitest'
import { getFrameMetadata } from './getFrameMetadata.js'

test('default', async () => {
  const metadata = await getFrameMetadata('https://frame.frog.fm/api').then(
    (m) => m.filter((m) => m.property !== 'frog:version'),
  )
  expect(metadata).toMatchInlineSnapshot(`
    [
      {
        "content": "vNext",
        "property": "fc:frame",
      },
      {
        "content": "1.91:1",
        "property": "fc:frame:image:aspect_ratio",
      },
      {
        "content": "https://frame.frog.fm/og.png",
        "property": "fc:frame:image",
      },
      {
        "content": "https://frame.frog.fm/og.png",
        "property": "og:image",
      },
      {
        "content": "Frog – Framework for Farcaster Frames",
        "property": "og:title",
      },
      {
        "content": "https://frame.frog.fm/api?initialPath=%252Fapi&amp;previousButtonValues=%2523A_%252C_l%252C_l",
        "property": "fc:frame:post_url",
      },
      {
        "content": "Features →",
        "property": "fc:frame:button:1",
      },
      {
        "content": "post",
        "property": "fc:frame:button:1:action",
      },
      {
        "content": "https://frame.frog.fm/api/features?initialPath=%252Fapi&amp;previousButtonValues=%2523A_%252C_l%252C_l",
        "property": "fc:frame:button:1:target",
      },
      {
        "content": "Docs",
        "property": "fc:frame:button:2",
      },
      {
        "content": "link",
        "property": "fc:frame:button:2:action",
      },
      {
        "content": "https://frog.fm",
        "property": "fc:frame:button:2:target",
      },
      {
        "content": "GitHub",
        "property": "fc:frame:button:3",
      },
      {
        "content": "link",
        "property": "fc:frame:button:3:action",
      },
      {
        "content": "https://github.com/wevm/frog",
        "property": "fc:frame:button:3:target",
      },
    ]
  `)
})
