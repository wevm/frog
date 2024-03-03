import { expect, test } from 'vitest'
import { getFrameMetadata } from './getFrameMetadata.js'

test('default', async () => {
  const metadata = await getFrameMetadata('https://frog.fm')
  expect(metadata).toMatchInlineSnapshot(`
    {
      "fc:frame": "vNext",
      "fc:frame:button:1:action": "post",
      "fc:frame:button:1:target": "https://frame.frog.fm/api/features",
      "fc:frame:button:2": "Docs",
      "fc:frame:button:2:action": "link",
      "fc:frame:button:2:target": "https://frog.fm",
      "fc:frame:button:3": "GitHub",
      "fc:frame:button:3:action": "link",
      "fc:frame:button:3:target": "https://github.com/wevm/frog",
      "fc:frame:image": "https://frame.frog.fm/og.png",
      "fc:frame:image:aspect_ratio": "1.91:1",
      "fc:frame:post_url": "https://frame.frog.fm/api",
      "fc:frame:state": "%7B%22initialPath%22%3A%22%2Fapi%22%2C%22previousButtonValues%22%3A%5Bnull%2C%22_l%22%2C%22_l%22%5D%2C%22previousState%22%3A%7B%22featureIndex%22%3A0%7D%7D",
    }
  `)
})
