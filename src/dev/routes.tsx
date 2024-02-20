import { type Env, type Schema } from 'hono'
import { inspectRoutes } from 'hono/dev'
import { jsxRenderer } from 'hono/jsx-renderer'
import { validator } from 'hono/validator'
import { ed25519 } from '@noble/curves/ed25519'
import { mnemonicToAccount } from 'viem/accounts'

import { type FarcBase } from '../farc-base.js'
import { parsePath } from '../utils/parsePath.js'
import {
  Fonts,
  Preview,
  type PreviewProps,
  Scripts,
  Styles,
  QRCode,
} from './components.js'
import {
  fetchFrame,
  getCodeHtml,
  getImageSize,
  getRoutes,
  htmlToFrame,
  htmlToState,
  validatePostBody,
} from './utils.js'
import { bytesToHex } from '@noble/curves/abstract/utils'

export function routes<
  state,
  env extends Env,
  schema extends Schema,
  basePath extends string,
>(app: FarcBase<state, env, schema, basePath>, path: string) {
  app.hono
    .use(`${parsePath(path)}/dev`, (c, next) =>
      jsxRenderer((props) => {
        const { children } = props
        const path = new URL(c.req.url).pathname.replace('/dev', '')
        return (
          <html lang="en">
            <head>
              <title>frame: {path || '/'}</title>
              <Fonts />
              <Styles />
              <Scripts />
            </head>
            <body>{children}</body>
          </html>
        )
      })(c, next),
    )
    .get(async (c) => {
      const baseUrl = c.req.url.replace('/dev', '')
      const t0 = performance.now()
      const response = await fetch(baseUrl)
      const t1 = performance.now()
      const speed = t1 - t0

      const htmlSize = await response
        .clone()
        .blob()
        .then((b) => b.size)
      const text = await response.text()

      const frame = htmlToFrame(text)
      const state = htmlToState(text)
      const contextHtml = await getCodeHtml(
        JSON.stringify(state.context, null, 2),
        'json',
      )
      const routes = getRoutes(baseUrl, inspectRoutes(app.hono))
      const imageSize = await getImageSize(frame.imageUrl)

      const props = {
        baseUrl,
        contextHtml,
        frame,
        request: {
          type: 'initial',
          method: 'get',
          metrics: {
            htmlSize,
            imageSize,
            speed,
          },
          response: {
            success: response.ok,
            status: response.status,
            statusText: response.statusText,
          },
          timestamp: Date.now(),
          url: baseUrl,
        },
        routes,
        state,
      } as const
      return c.render(<Preview {...props} />)
    })

  app.hono
    .get(`${parsePath(path)}/dev/frame`, async (c) => {
      const baseUrl = c.req.url.replace('/dev/frame', '')
      const t0 = performance.now()
      const response = await fetch(baseUrl)
      const t1 = performance.now()
      const speed = t1 - t0

      const htmlSize = await response
        .clone()
        .blob()
        .then((b) => b.size)
      const text = await response.text()

      const frame = htmlToFrame(text)
      const state = htmlToState(text)
      const contextHtml = await getCodeHtml(
        JSON.stringify(state.context, null, 2),
        'json',
      )
      const routes = getRoutes(baseUrl, inspectRoutes(app.hono))
      const imageSize = await getImageSize(frame.imageUrl)

      return c.json({
        baseUrl,
        contextHtml,
        frame,
        request: {
          type: 'initial',
          method: 'get',
          metrics: {
            htmlSize,
            imageSize,
            speed,
          },
          response: {
            success: response.ok,
            status: response.status,
            statusText: response.statusText,
          },
          timestamp: Date.now(),
          url: baseUrl,
        },
        routes,
        state,
      } satisfies PreviewProps)
    })
    .post(
      `${parsePath(path)}/dev/frame/action`,
      validator('json', validatePostBody),
      async (c) => {
        const baseUrl = c.req.url.replace('/dev/frame/action', '')
        const json = c.req.valid('json')
        const { buttonIndex, castId, fid, inputText, postUrl } = json

        const { response, speed } = await fetchFrame({
          baseUrl,
          buttonIndex,
          castId,
          fid,
          inputText,
          postUrl,
        })

        const htmlSize = await response
          .clone()
          .blob()
          .then((b) => b.size)
        const text = await response.text()
        const frame = htmlToFrame(text)
        const state = htmlToState(text)
        const contextHtml = await getCodeHtml(
          JSON.stringify(state.context, null, 2),
          'json',
        )
        const routes = getRoutes(baseUrl, inspectRoutes(app.hono))
        const imageSize = await getImageSize(frame.imageUrl)

        return c.json({
          baseUrl,
          contextHtml,
          frame,
          request: {
            type: 'response',
            body: {
              ...json,
              castId: { ...json.castId, hash: json.castId.hash.toString() },
            },
            method: 'post',
            metrics: {
              htmlSize,
              imageSize,
              speed,
            },
            response: {
              success: response.ok,
              status: response.status,
              statusText: response.statusText,
            },
            timestamp: Date.now(),
            url: postUrl,
          },
          routes,
          state,
        } satisfies PreviewProps)
      },
    )
    .post(
      `${parsePath(path)}/dev/frame/redirect`,
      validator('json', validatePostBody),
      async (c) => {
        const baseUrl = c.req.url.replace('/dev/frame/redirect', '')
        const json = c.req.valid('json')
        const { buttonIndex, castId, fid, inputText, postUrl } = json

        const { response, speed } = await fetchFrame({
          baseUrl,
          buttonIndex,
          castId,
          fid,
          inputText,
          postUrl,
        })

        return c.json({
          type: 'redirect',
          body: {
            ...json,
            castId: { ...json.castId, hash: json.castId.hash.toString() },
          },
          method: 'post',
          metrics: {
            speed,
          },
          response: {
            success: response.redirected,
            status: response.ok ? 302 : response.status,
            statusText: response.statusText,
            location: response.url,
          },
          timestamp: Date.now(),
          url: postUrl,
        } satisfies PreviewProps['request'])
      },
    )
    .get(`${parsePath(path)}/dev/frame/auth/code`, async (c) => {
      // TODO: Configure
      const fid = process.env.APP_FID
      const mnemonic = process.env.APP_MNEMONIC
      if (!fid || !mnemonic) throw new Error('Missing APP_FID or APP_MNEMONIC')
      const app = { fid, mnemonic } as const

      // 1. Create keypair
      const privateKeyBytes = ed25519.utils.randomPrivateKey()
      const publicKeyBytes = ed25519.getPublicKey(privateKeyBytes)
      // const privateKey = `0x${bytesToHex(privateKeyBytes)}`
      const publicKey = `0x${bytesToHex(publicKeyBytes)}` as const

      // 2. Sign key request
      const account = mnemonicToAccount(app.mnemonic)
      const deadline = Math.floor(Date.now() / 1000) + 60 * 60 // now + hour
      const signature = await account.signTypedData({
        domain: {
          name: 'Farcaster SignedKeyRequestValidator',
          version: '1',
          chainId: 10,
          verifyingContract: '0x00000000FC700472606ED4fA22623Acf62c60553',
        },
        types: {
          SignedKeyRequest: [
            { name: 'requestFid', type: 'uint256' },
            { name: 'key', type: 'bytes' },
            { name: 'deadline', type: 'uint256' },
          ],
        },
        primaryType: 'SignedKeyRequest',
        message: {
          requestFid: BigInt(app.fid),
          key: publicKey,
          deadline: BigInt(deadline),
        },
      })

      // 3. Create key request to register public key
      const response = await fetch(
        'https://api.warpcast.com/v2/signed-key-requests',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            deadline,
            key: publicKey,
            requestFid: app.fid,
            signature,
          }),
        },
      ).then(
        (response) =>
          response.json() as Promise<{
            result: { signedKeyRequest: SignedKeyRequest }
          }>,
      )
      type SignedKeyRequest = {
        deeplinkUrl: string
        key: string
        requestFid: number
        state: string
        token: string
      }

      // 4. Return QR code matrix for deeplink
      const rendered = await c.render(
        <QRCode url={response.result.signedKeyRequest.deeplinkUrl} />,
      )
      const code = await rendered.text()

      // TODO: Add keys to secure cookie
      return c.json({
        code,
        url: response.result.signedKeyRequest.deeplinkUrl,
      })
    })
}

// const { response: statusResponse, data: statusData } = await appClient.status({
//   channelToken: createChannelData.channelToken,
// })
// if (statusResponse.status !== 202)
//   throw new Error(`error status: ${statusResponse.statusText}`)
// console.log('status', statusData.state)
