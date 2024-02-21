import { bytesToHex } from '@noble/curves/abstract/utils'
import { ed25519 } from '@noble/curves/ed25519'
import { type Env, type Schema } from 'hono'
import {
  deleteCookie,
  getCookie,
  getSignedCookie,
  setCookie,
  setSignedCookie,
} from 'hono/cookie'
import { inspectRoutes } from 'hono/dev'
import { jsxRenderer } from 'hono/jsx-renderer'
import { type CookieOptions } from 'hono/utils/cookie'
import { validator } from 'hono/validator'
import { mnemonicToAccount } from 'viem/accounts'

import type { FrogBase } from '../frog-base.js'
import { parsePath } from '../utils/parsePath.js'
import {
  Fonts,
  Preview,
  type PreviewProps,
  QRCode,
  Scripts,
  Styles,
} from './components.js'
import { type SignedKeyRequest } from './types.js'
import {
  fetchFrame,
  getCodeHtml,
  getImageSize,
  getRoutes,
  htmlToFrame,
  htmlToState,
  validateFramePostBody,
} from './utils.js'

// TODO: Lock down options
const cookieOptions = {
  secure: true,
  sameSite: 'Strict',
} as CookieOptions

export function routes<
  state,
  env extends Env,
  schema extends Schema,
  basePath extends string,
>(app: FrogBase<state, env, schema, basePath>, path: string) {
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
      validator('json', validateFramePostBody),
      async (c) => {
        const json = c.req.valid('json')
        const { buttonIndex, castId, inputText, postUrl, state } = json

        let cookie: string | boolean | undefined
        if (app.devtools?.secret)
          cookie = await getSignedCookie(c, app.devtools.secret, 'session')
        else cookie = getCookie(c, 'session')
        const keypair = cookie
          ? (JSON.parse(cookie) as
              | { privateKey: `0x${string}`; publicKey: `0x${string}` }
              | undefined)
          : undefined

        let fid: number
        if (json.fid) fid = json.fid
        else {
          const cookie = getCookie(c, 'user')
          if (cookie) fid = JSON.parse(cookie).userFid
          else fid = 1
        }

        const { response, speed } = await fetchFrame({
          buttonIndex,
          castId,
          fid,
          inputText,
          postUrl,
          state,
          privateKey: keypair?.privateKey,
        })

        const htmlSize = await response
          .clone()
          .blob()
          .then((b) => b.size)
        const text = await response.text()
        const frame = htmlToFrame(text)
        const state_ = htmlToState(text)
        const contextHtml = await getCodeHtml(
          JSON.stringify(state_.context, null, 2),
          'json',
        )
        const imageSize = await getImageSize(frame.imageUrl)

        const baseUrl = c.req.url.replace('/dev/frame/action', '')
        const routes = getRoutes(baseUrl, inspectRoutes(app.hono))

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
          state: state_,
        } satisfies PreviewProps)
      },
    )
    .post(
      `${parsePath(path)}/dev/frame/redirect`,
      validator('json', validateFramePostBody),
      async (c) => {
        const json = c.req.valid('json')
        const { buttonIndex, castId, inputText, postUrl, state } = json

        let cookie: string | boolean | undefined
        if (app.devtools?.secret)
          cookie = await getSignedCookie(c, app.devtools.secret, 'session')
        else cookie = getCookie(c, 'session')
        const keypair = cookie
          ? (JSON.parse(cookie) as
              | { privateKey: `0x${string}`; publicKey: `0x${string}` }
              | undefined)
          : undefined

        let fid: number
        if (json.fid) fid = json.fid
        else {
          const cookie = getCookie(c, 'user')
          if (cookie) fid = JSON.parse(cookie).userFid
          else fid = 1
        }

        const { response, speed } = await fetchFrame({
          buttonIndex,
          castId,
          fid,
          inputText,
          postUrl,
          state,
          privateKey: keypair?.privateKey,
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
    .post(`${parsePath(path)}/dev/frame/auth/logout`, async (c) => {
      deleteCookie(c, 'session')
      deleteCookie(c, 'user')
      return c.json({ success: true })
    })
    .get(`${parsePath(path)}/dev/frame/auth/code`, async (c) => {
      // 1. Create keypair
      const privateKeyBytes = ed25519.utils.randomPrivateKey()
      const publicKeyBytes = ed25519.getPublicKey(privateKeyBytes)
      const privateKey = `0x${bytesToHex(privateKeyBytes)}`
      const publicKey = `0x${bytesToHex(publicKeyBytes)}` as const

      // 2. Sign key request. By default, use hosted service.
      let deadline: number
      let requestFid: string
      let signature: string
      if (app.devtools?.appFid && app.devtools?.appMnemonic) {
        const account = mnemonicToAccount(app.devtools.appMnemonic)
        deadline = Math.floor(Date.now() / 1000) + 60 * 60 // now + hour
        requestFid = app.devtools.appFid
        signature = await account.signTypedData({
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
            requestFid: BigInt(app.devtools.appFid),
            key: publicKey,
            deadline: BigInt(deadline),
          },
        })
      } else {
        const response = (await fetch(
          `https://auth.frog.fm/api/signed-key-requests/${publicKey}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          },
        ).then((response) => response.json())) as {
          deadline: number
          requestFid: string
          signature: string
        }

        deadline = response.deadline
        requestFid = response.requestFid
        signature = response.signature
      }

      // 3. Create key request to register public key
      const response = (await fetch(
        'https://api.warpcast.com/v2/signed-key-requests',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deadline,
            key: publicKey,
            requestFid,
            signature,
          }),
        },
      ).then((response) => response.json())) as {
        result: { signedKeyRequest: SignedKeyRequest }
      }

      const { token, deeplinkUrl: url } = response.result.signedKeyRequest

      // 4. Return QR code matrix for deeplink
      const rendered = await c.render(<QRCode url={url} />)
      const code = await rendered.text()

      // 5. Save keypair in cookie
      const value = JSON.stringify({ privateKey, publicKey })
      if (app.devtools?.secret)
        await setSignedCookie(
          c,
          'session',
          value,
          app.devtools?.secret,
          cookieOptions,
        )
      else setCookie(c, 'session', value, cookieOptions)

      return c.json({ code, token, url })
    })
    .get(`${parsePath(path)}/dev/frame/auth/status/:token`, async (c) => {
      // @ts-ignore TODO: Fix inference on path param
      const token = c.req.param('token') as string
      const response = (await fetch(
        `https://api.warpcast.com/v2/signed-key-request?token=${token}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        },
      ).then((response) => response.json())) as {
        result: { signedKeyRequest: SignedKeyRequest }
      }
      const { state = 'pending', userFid } =
        response.result?.signedKeyRequest ?? {}

      if (state === 'completed') {
        const response = (await fetch(
          `${app.hubApiUrl}/v1/userDataByFid?fid=${userFid}`,
        ).then((response) => response.json())) as {
          messages: {
            data: {
              type: 'MESSAGE_TYPE_USER_DATA_ADD'
              userDataBody: {
                type: 'USER_DATA_TYPE_PFP' | 'USER_DATA_TYPE_USERNAME'
                value: string
              }
            }
          }[]
        }

        const pfp = response.messages.find(
          (message) =>
            message.data.type === 'MESSAGE_TYPE_USER_DATA_ADD' &&
            message.data.userDataBody.type === 'USER_DATA_TYPE_PFP',
        )?.data.userDataBody.value
        const username = response.messages.find(
          (message) =>
            message.data.type === 'MESSAGE_TYPE_USER_DATA_ADD' &&
            message.data.userDataBody.type === 'USER_DATA_TYPE_USERNAME',
        )?.data.userDataBody.value

        setCookie(c, 'user', JSON.stringify({ userFid }), cookieOptions)
        return c.json({ state, userFid, pfp, token, username })
      }

      return c.json({ state })
    })
}
