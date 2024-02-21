import { expect, test } from 'vitest'
import { vi } from 'vitest'

import { app } from './index'

test('GET /api/ping', async () => {
  const res = await app.request('/api/ping')
  expect(res.status).toBe(200)
  await expect(res.text()).resolves.toMatchInlineSnapshot(`"pong"`)
})

test('GET /api/signed-key-requests/:publicKey', async () => {
  // Make dates stable across runs
  Date.now = vi.fn(() => new Date(Date.UTC(2024, 1, 1)).valueOf())

  const res = await app.request(
    '/api/signed-key-requests/0x39d518f4ab15fa175a0896aed1291f9ec434a39089f7df68925dd3f0a79843f7',
  )
  expect(res.status).toBe(200)
  await expect(res.json()).resolves.toMatchInlineSnapshot(`
    {
      "deadline": 1706749200,
      "requestFid": "362061",
      "signature": "0xd1ae0d689e1d45855d49a578bd91af7c5d574257a2560fced2a6e377cb45a7c247bcc65a4383eaac392238b6b3c7a652315443759f174b39cea189cdb20a21f91c",
    }
  `)
})
