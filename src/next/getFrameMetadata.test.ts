import { expect, test } from 'vitest'
import { getFrameMetadata } from './getFrameMetadata.js'

test('default', async () => {
  const metadata = await getFrameMetadata('https://frame.frog.fm/api')
  // biome-ignore lint/performance/noDelete: <explanation>
  delete metadata['frog:version']
  expect(metadata).toMatchInlineSnapshot(`
    {
      "fc:frame": "vNext",
      "fc:frame:button:1": "Features →",
      "fc:frame:button:1:action": "post",
      "fc:frame:button:1:target": "https://frame.frog.fm/api/features?initialPath=%252Fapi&amp;previousButtonValues=%2523A_%252C_l%252C_l",
      "fc:frame:button:2": "Docs",
      "fc:frame:button:2:action": "link",
      "fc:frame:button:2:target": "https://frog.fm",
      "fc:frame:button:3": "GitHub",
      "fc:frame:button:3:action": "link",
      "fc:frame:button:3:target": "https://github.com/wevm/frog",
      "fc:frame:image": "https://frame.frog.fm/og.png",
      "fc:frame:image:aspect_ratio": "1.91:1",
      "fc:frame:post_url": "https://frame.frog.fm/api?initialPath=%252Fapi&amp;previousButtonValues=%2523A_%252C_l%252C_l",
      "og:image": "https://frame.frog.fm/og.png",
      "og:title": "Frog – Framework for Farcaster Frames",
    }
  `)
})
