import { expect, test } from 'vitest'
import { isFrameRequest } from './isFrameRequest.js'

test('default', async () => {
  expect(
    isFrameRequest(
      new Headers({ 'User-Agent': 'FCBot/0.1 (like TwitterBot)' }),
    ),
  ).to.be.true
})
