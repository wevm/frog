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

import { type FrogBase } from '../frog-base.js'
import { parsePath } from '../utils/parsePath.js'
import { Fonts } from './components/Fonts.js'
import { Preview, type PreviewProps } from './components/Preview.js'
import { QRCode } from './components/QRCode.js'
import { Scripts } from './components/Scripts.js'
import { Styles } from './components/Styles.js'
import {
  type SignedKeyRequestResponse,
  type UserDataByFidResponse,
} from './types.js'
import { fetchFrame } from './utils/fetchFrame.js'
import { getCodeHtml } from './utils/getCodeHtml.js'
import { getHtmlSize } from './utils/getHtmlSize.js'
import { getImageSize } from './utils/getImageSize.js'
import { getRoutes } from './utils/getRoutes.js'
import { htmlToFrame } from './utils/htmlToFrame.js'
import { htmlToState } from './utils/htmlToState.js'
import { validateFramePostBody } from './utils/validateFramePostBody.js'

export function routes<
  state,
  env extends Env,
  schema extends Schema,
  basePath extends string,
>(app: FrogBase<state, env, schema, basePath>, path: string) {
  app
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
      const url = c.req.url.replace('/dev', '')
      const props = await get(url)
      return c.render(<Preview {...props} />)
    })

  app.get(`${parsePath(path)}/dev/frame`, async (c) => {
    const url = c.req.url.replace('/dev/frame', '')
    const props = await get(url)
    return c.json(props)
  })

  async function get(url: string) {
    const timestamp = Date.now()

    const startTime = performance.now()
    const response = await fetch(url)
    const endTime = performance.now()

    const clonedResponse = response.clone()
    const text = await response.text()
    const frame = htmlToFrame(text)
    const state = htmlToState(text)

    const [htmlSize, imageSize] = await Promise.all([
      getHtmlSize(clonedResponse),
      getImageSize(frame.imageUrl),
    ])
    const request = {
      type: 'initial',
      method: 'get',
      metrics: {
        htmlSize,
        imageSize,
        speed: endTime - startTime,
      },
      response: {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
      },
      timestamp,
      url,
    } as const

    const routes = getRoutes(url, inspectRoutes(app.hono))

    const [contextHtml, metaTagsHtml] = await Promise.all([
      getCodeHtml(JSON.stringify(state.context, null, 2), 'json'),
      getCodeHtml(frame.debug.htmlTags.join('\n'), 'html'),
    ])
    const tools = {
      contextHtml,
      metaTagsHtml,
    }

    return {
      frame,
      request,
      routes,
      state,
      tools,
    } satisfies PreviewProps
  }

  /////////////////////////////////////////////////////////////////////////////////////////
  // Post Frame Actions
  /////////////////////////////////////////////////////////////////////////////////////////

  app
    .use('*', async (c, next) => {
      {
        const cookie = app.devtools?.secret
          ? await getSignedCookie(c, app.devtools.secret, 'session')
          : getCookie(c, 'session')
        const keypair = cookie
          ? (JSON.parse(cookie) as
              | { privateKey: `0x${string}`; publicKey: `0x${string}` }
              | undefined)
          : undefined
        // @ts-ignore
        c.set('keypair', keypair)
      }

      {
        const cookie = getCookie(c, 'user')
        const fid = cookie ? (JSON.parse(cookie).userFid as number) : undefined
        // @ts-ignore
        c.set('fid', fid)
      }

      await next()
    })
    .post(
      `${parsePath(path)}/dev/frame/action`,
      validator('json', validateFramePostBody),
      async (c) => {
        const timestamp = Date.now()
        const url = c.req.url.replace('/dev/frame/action', '')
        const json = c.req.valid('json')

        // @ts-ignore
        const privateKey = c.var.keypair?.privateKey as `0x${string}`
        // @ts-ignore
        const fid = (json.fid ?? c.var.fid ?? 1) as number

        const { buttonIndex, castId, inputText, postUrl } = json
        const { response, speed } = await fetchFrame({
          buttonIndex,
          castId,
          fid,
          inputText,
          postUrl,
          state: json.state,
          privateKey,
        })

        const clonedResponse = response.clone()
        const text = await response.text()
        const frame = htmlToFrame(text)
        const state = htmlToState(text)

        const [htmlSize, imageSize] = await Promise.all([
          getHtmlSize(clonedResponse),
          getImageSize(frame.imageUrl),
        ])
        const request = {
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
          timestamp,
          url: postUrl,
        } as const

        const routes = getRoutes(url, inspectRoutes(app.hono))

        const [contextHtml, metaTagsHtml] = await Promise.all([
          getCodeHtml(JSON.stringify(state.context, null, 2), 'json'),
          getCodeHtml(frame.debug.htmlTags.join('\n'), 'html'),
        ])
        const tools = {
          contextHtml,
          metaTagsHtml,
        }

        return c.json({
          frame,
          request,
          routes,
          state,
          tools,
        } satisfies PreviewProps)
      },
    )
    .post(
      `${parsePath(path)}/dev/frame/redirect`,
      validator('json', validateFramePostBody),
      async (c) => {
        const timestamp = Date.now()
        const json = c.req.valid('json')

        // @ts-ignore
        const privateKey = c.var.keypair?.privateKey as `0x${string}`
        // @ts-ignore
        const fid = (json.fid ?? c.var.fid ?? 1) as number

        const { buttonIndex, castId, inputText, postUrl, state } = json
        const { response, speed } = await fetchFrame({
          buttonIndex,
          castId,
          fid,
          inputText,
          postUrl,
          state,
          privateKey,
        })

        return c.json({
          type: 'redirect',
          body: {
            ...json,
            castId: { ...json.castId, hash: json.castId.hash.toString() },
          },
          method: 'post',
          metrics: { speed },
          response: {
            success: response.redirected,
            location: response.url,
            status: response.ok ? 302 : response.status,
            statusText: response.statusText,
          },
          timestamp,
          url: postUrl,
        } satisfies PreviewProps['request'])
      },
    )

  /////////////////////////////////////////////////////////////////////////////////////////
  // Auth
  /////////////////////////////////////////////////////////////////////////////////////////

  const cookieOptions = {
    maxAge: 7 * 86_400,
    sameSite: 'Strict',
    secure: true,
  } as CookieOptions

  app
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
      ).then((response) => response.json())) as SignedKeyRequestResponse

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
      else setCookie(c, 'session', value, { ...cookieOptions, httpOnly: true })

      return c.json({ code, token, url })
    })
    .get(`${parsePath(path)}/dev/frame/auth/status/:token`, async (c) => {
      // @ts-ignore
      const token = c.req.param('token') as string
      const response = (await fetch(
        `https://api.warpcast.com/v2/signed-key-request?token=${token}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        },
      ).then((response) => response.json())) as SignedKeyRequestResponse
      const { state = 'pending', userFid } =
        response.result?.signedKeyRequest ?? {}

      if (state === 'completed') {
        const response = (await fetch(
          `${app.hubApiUrl}/v1/userDataByFid?fid=${userFid}`,
        ).then((response) => response.json())) as UserDataByFidResponse

        let pfp = undefined
        let username = undefined
        let displayName = undefined
        for (const message of response.messages) {
          if (message.data.type !== 'MESSAGE_TYPE_USER_DATA_ADD') continue

          const type = message.data.userDataBody.type
          const value = message.data.userDataBody.value
          if (type === 'USER_DATA_TYPE_PFP') pfp = value
          if (type === 'USER_DATA_TYPE_USERNAME') username = value
          if (type === 'USER_DATA_TYPE_DISPLAY') displayName = value
        }

        setCookie(c, 'user', JSON.stringify({ token, userFid }), cookieOptions)
        return c.json({ state, userFid, pfp, token, username, displayName })
      }

      return c.json({ state })
    })
    .post(`${parsePath(path)}/dev/frame/auth/logout`, async (c) => {
      deleteCookie(c, 'session')
      deleteCookie(c, 'user')
      return c.json({ success: true })
    })
}
