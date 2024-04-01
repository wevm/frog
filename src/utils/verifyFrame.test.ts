import { expect, test } from 'vitest'
import { frog } from '../hubs/frog.js'
import { verifyFrame } from './verifyFrame.js'

test('valid', async () => {
  const messageBytes =
    '0a4f080d10ff2f18c1a6802f20018201400a2168747470733a2f2f746573742d66617263362e76657263656c2e6170702f61706910011a1908ff2f1214000000000000000000000000000000000000000112141de03010b0ce4f39ba4b8ff29851d0d610dc5ddd180122404aab47af096150fe7193713722bcdd6ddcd6cd35c1e84cc42e7713624916a97568fa8232e2ffd70ce5eeafb0391c7bbcdf6c5ba15a9a02834102b016058e7d0128013220daa3f0a5335900f542a266e4b837309aeac52d736f4cf9b2eff0d4c4f4c7e58f'
  await verifyFrame({
    frameUrl: 'https://test-farc6.vercel.app/api/foo',
    hub: frog(),
    trustedData: { messageBytes },
    url: 'https://test-farc6.vercel.app/api',
  })
})

test('invalid hash', async () => {
  const messageBytes =
    '0a4d080d10ff2f18c1a6802f20018201400a2168747470733a2a2f746573742d66617263362e76657263656c2e6170702f61706910011a1908ff2f1214000000000000000000000000000000000000000112141de03010b0ce4f39ba4b8ff29851d0d610dc5ddd180122404aab47af096150fe7193713722bcdd6ddcd6cd35c1e84cc42e7713624916a97568fa8232e2ffd70ce5eeafb0391c7bbcdf6c5ba15a9a02834102b016058e7d0128013220daa3f0a5335900f542a266e4b837309aeac52d736f4cf9b2eff0d4c4f4c7e58f'
  await expect(() =>
    verifyFrame({
      frameUrl: 'https://test-farc6.vercel.app/api',
      hub: frog(),
      trustedData: { messageBytes },
      url: 'https://test-farc6.vercel.app/api',
    }),
  ).rejects.toMatchInlineSnapshot(`[Error: message is invalid. invalid hash. Expected=29,224,48,16,176,206,79,57,186,75,143,242,152,81,208,214,16,220,93,221, computed=8,220,37,101,87,167,118,64,111,118,46,240,175,199,186,11,191,124,144,0]`)
})

test('invalid url', async () => {
  const messageBytes =
    '0a4f080d10ff2f18c1a6802f20018201400a2168747470733a2f2f746573742d66617263362e76657263656c2e6170702f61706910011a1908ff2f1214000000000000000000000000000000000000000112141de03010b0ce4f39ba4b8ff29851d0d610dc5ddd180122404aab47af096150fe7193713722bcdd6ddcd6cd35c1e84cc42e7713624916a97568fa8232e2ffd70ce5eeafb0391c7bbcdf6c5ba15a9a02834102b016058e7d0128013220daa3f0a5335900f542a266e4b837309aeac52d736f4cf9b2eff0d4c4f4c7e58f'
  await expect(() =>
    verifyFrame({
      frameUrl: 'https://test-farc7.vercel.app/api',
      hub: frog(),
      trustedData: { messageBytes },
      url: 'https://test-farc6.vercel.app/foo',
    }),
  ).rejects.toMatchInlineSnapshot(
    '[Error: Invalid frame url: https://test-farc7.vercel.app/api. Expected: https://test-farc6.vercel.app/foo.]',
  )
})
