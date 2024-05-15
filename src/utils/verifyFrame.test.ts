import { expect, test } from 'vitest'
import { neynar } from '../hubs/neynar.js'
import { verifyFrame } from './verifyFrame.js'

test('valid', async () => {
  const messageBytes =
    '0a4f080d10ff2f18c1a6802f20018201400a2168747470733a2f2f746573742d66617263362e76657263656c2e6170702f61706910011a1908ff2f1214000000000000000000000000000000000000000112141de03010b0ce4f39ba4b8ff29851d0d610dc5ddd180122404aab47af096150fe7193713722bcdd6ddcd6cd35c1e84cc42e7713624916a97568fa8232e2ffd70ce5eeafb0391c7bbcdf6c5ba15a9a02834102b016058e7d0128013220daa3f0a5335900f542a266e4b837309aeac52d736f4cf9b2eff0d4c4f4c7e58f'
  await verifyFrame({
    frameUrl: 'https://test-farc6.vercel.app/api/foo',
    hub: neynar({ apiKey: 'NEYNAR_FROG_FM' }),
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
      hub: neynar({ apiKey: 'NEYNAR_FROG_FM' }),
      trustedData: { messageBytes },
      url: 'https://test-farc6.vercel.app/api',
    }),
  ).rejects.toMatchInlineSnapshot(
    '[Error: message is invalid. No data in message.]',
  )
})

test('invalid url', async () => {
  const messageBytes =
    '0a4f080d10ff2f18c1a6802f20018201400a2168747470733a2f2f746573742d66617263362e76657263656c2e6170702f61706910011a1908ff2f1214000000000000000000000000000000000000000112141de03010b0ce4f39ba4b8ff29851d0d610dc5ddd180122404aab47af096150fe7193713722bcdd6ddcd6cd35c1e84cc42e7713624916a97568fa8232e2ffd70ce5eeafb0391c7bbcdf6c5ba15a9a02834102b016058e7d0128013220daa3f0a5335900f542a266e4b837309aeac52d736f4cf9b2eff0d4c4f4c7e58f'
  await expect(() =>
    verifyFrame({
      frameUrl: 'https://test-farc7.vercel.app/api',
      hub: neynar({ apiKey: 'NEYNAR_FROG_FM' }),
      trustedData: { messageBytes },
      url: 'https://test-farc6.vercel.app/foo',
    }),
  ).rejects.toMatchInlineSnapshot(
    '[Error: Invalid frame url: https://test-farc7.vercel.app/api. Expected: https://test-farc6.vercel.app/foo.]',
  )
})

test('valid neynar', async () => {
  const messageBytes =
    '0a4f080d10ff2f18c1a6802f20018201400a2168747470733a2f2f746573742d66617263362e76657263656c2e6170702f61706910011a1908ff2f1214000000000000000000000000000000000000000112141de03010b0ce4f39ba4b8ff29851d0d610dc5ddd180122404aab47af096150fe7193713722bcdd6ddcd6cd35c1e84cc42e7713624916a97568fa8232e2ffd70ce5eeafb0391c7bbcdf6c5ba15a9a02834102b016058e7d0128013220daa3f0a5335900f542a266e4b837309aeac52d736f4cf9b2eff0d4c4f4c7e58f'
  await verifyFrame({
    frameUrl: 'https://test-farc6.vercel.app/api/foo',
    hub: neynar({
      apiKey: 'NEYNAR_FROG_FM',
    }),
    trustedData: { messageBytes },
    url: 'https://test-farc6.vercel.app/api',
  })
})

test('invalid hash neynar', async () => {
  const messageBytes =
    '0a4d080d10ff2f18c1a6802f20018201400a2168747470733a2a2f746573742d66617263362e76657263656c2e6170702f61706910011a1908ff2f1214000000000000000000000000000000000000000112141de03010b0ce4f39ba4b8ff29851d0d610dc5ddd180122404aab47af096150fe7193713722bcdd6ddcd6cd35c1e84cc42e7713624916a97568fa8232e2ffd70ce5eeafb0391c7bbcdf6c5ba15a9a02834102b016058e7d0128013220daa3f0a5335900f542a266e4b837309aeac52d736f4cf9b2eff0d4c4f4c7e58f'
  await expect(() =>
    verifyFrame({
      frameUrl: 'https://test-farc6.vercel.app/api',
      hub: neynar({
        apiKey: 'NEYNAR_FROG_FM',
      }),
      trustedData: { messageBytes },
      url: 'https://test-farc6.vercel.app/api',
    }),
  ).rejects.toMatchInlineSnapshot(
    '[Error: message is invalid. No data in message.]',
  )
})

test('invalid url neynar', async () => {
  const messageBytes =
    '0a49080d1085940118f6a6a32e20018201390a1a86db69b3ffdf6ab8acb6872b69ccbe7eb6a67af7ab71e95aa69f10021a1908ef011214237025b322fd03a9ddc7ec6c078fb9c56d1a72111214e3d88aeb2d0af356024e0c693f31c11b42c76b721801224043cb2f3fcbfb5dafce110e934b9369267cf3d1aef06f51ce653dc01700fc7b778522eb7873fd60dda4611376200076caf26d40a736d3919ce14e78a684e4d30b280132203a66717c82d728beb3511b05975c6603275c7f6a0600370bf637b9ecd2bd231e'
  await expect(() =>
    verifyFrame({
      frameUrl: 'https://test-farc7.vercel.app/api',
      hub: neynar({
        apiKey: 'NEYNAR_FROG_FM',
      }),
      trustedData: { messageBytes },
      url: 'https://test-farc6.vercel.app/foo',
    }),
  ).rejects.toMatchInlineSnapshot(
    '[Error: Invalid frame url: https://test-farc7.vercel.app/api. Expected: https://test-farc6.vercel.app/foo.]',
  )
})
