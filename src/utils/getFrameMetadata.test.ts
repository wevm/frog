import { expect, test } from 'vitest'
import { getFrameMetadata } from './getFrameMetadata.js'

test('default', async () => {
  const metadata = await getFrameMetadata('https://frog.fm')
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
        "content": "https://frame.frog.fm/api",
        "property": "fc:frame:post_url",
      },
      {
        "content": "%7B%22initialPath%22%3A%22%2Fapi%22%2C%22previousButtonValues%22%3A%5Bnull%2C%22_l%22%2C%22_l%22%5D%2C%22previousState%22%3A%7B%22featureIndex%22%3A0%7D%7D",
        "property": "fc:frame:state",
      },
      {
        "content": "post",
        "property": "fc:frame:button:1:action",
      },
      {
        "content": "https://frame.frog.fm/api/features",
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
