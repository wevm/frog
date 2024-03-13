import { bytesToHex } from '@noble/curves/abstract/utils'
import { ed25519 } from '@noble/curves/ed25519'
import { type Schema } from 'hono'
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

import { type Frog } from '../frog.js'
import type { Env } from '../types/env.js'
import { verify } from '../utils/jws.js'
import { parsePath } from '../utils/parsePath.js'
import { toSearchParams } from '../utils/toSearchParams.js'
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
import { getHtmlSize } from './utils/getHtmlSize.js'
import { getImageSize } from './utils/getImageSize.js'
import { getRoutes } from './utils/getRoutes.js'
import { htmlToMetadata } from './utils/htmlToMetadata.js'
import { uid } from './utils/uid.js'
import { validateFramePostBody } from './utils/validateFramePostBody.js'

export function routes<
  env extends Env,
  schema extends Schema,
  basePath extends string,
  //
  _state = env['State'],
>(app: Frog<env, schema, basePath, _state>, path: string) {
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
              <link
                rel="icon"
                href="https://frog.fm/icon.png"
                type="image/png"
              />
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

  // ngrok free redirects to `https` in the browser, but does not set
  // protocol to `https` on requests so need to correct
  const ngrokHostname = 'ngrok-free.app'
  // https://regexr.com/7sr6u
  const ngrokHttpRegex =
    /(http)((?:(?::\/\/)|(?:%253A%252F%252F)|(?:%3A%2F%2F))[a-z0-9\-]*\.ngrok-free\.app)/g

  async function get(url: string) {
    const timestamp = Date.now()

    performance.mark('start')
    const response = await fetch(url)
    performance.mark('end')

    const clonedResponse = response.clone()
    let text = await response.text()
    if (text.includes(ngrokHostname))
      text = text.replace(ngrokHttpRegex, 'https$2')

    const metadata = htmlToMetadata(text)
    const { context, frame } = metadata

    performance.measure('fetch', 'start', 'end')
    const measure = performance.getEntriesByName('fetch')[0]
    const speed = measure.duration
    performance.clearMarks()
    performance.clearMeasures()

    const cleanedUrl = new URL(url)
    cleanedUrl.search = ''
    let cleanedUrlString = cleanedUrl.toString().replace(/\/$/, '')
    if (cleanedUrlString.includes(ngrokHostname))
      cleanedUrlString = cleanedUrlString.replace(ngrokHttpRegex, 'https$2')

    const [htmlSize, imageSize] = await Promise.all([
      getHtmlSize(clonedResponse),
      getImageSize(frame.imageUrl),
    ])
    const routes = getRoutes(url, inspectRoutes(app.hono))

    // remove serialized context from image/imageUrl to save url space
    // tip: search for `_frog_` to see where it's added back
    const contextString = toSearchParams(context).toString()
    frame.image = frame.image.replace(contextString, '_frog_image')
    frame.imageUrl = frame.imageUrl.replace(contextString, '_frog_imageUrl')

    return {
      data: {
        id: uid(),
        type: 'initial',
        method: 'get',
        context,
        frame,
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
        url: cleanedUrlString,
      },
      routes,
    } satisfies PreviewProps
  }

  /////////////////////////////////////////////////////////////////////////////////////////
  // Post Frame Actions
  /////////////////////////////////////////////////////////////////////////////////////////

  app
    .use('*', async (c, next) => {
      const user = getCookie(c, 'user')
      const fid = user ? JSON.parse(user).userFid : undefined
      // @ts-ignore
      c.set('fid', fid)

      const session = app.secret
        ? await getSignedCookie(c, app.secret, 'session')
        : getCookie(c, 'session')
      const keypair = session ? JSON.parse(session) : undefined
      // @ts-ignore
      c.set('keypair', keypair)

      await next()
    })
    .post(
      `${parsePath(path)}/dev/frame/action`,
      validator('json', validateFramePostBody),
      async (c) => {
        // TODO: Hono should be able to infer these types
        const vars = c.var as unknown as {
          fid: number
          keypair: { privateKey: string } | undefined
        }

        const json = c.req.valid('json')
        const fid = (json.fid ?? vars.fid) as number
        const body = { ...json, fid }
        const privateKey = vars.keypair?.privateKey
        const response = await fetchFrame({ body, privateKey })

        performance.measure('fetch', 'start', 'end')
        const measure = performance.getEntriesByName('fetch')[0]
        const speed = measure.duration
        performance.clearMarks()
        performance.clearMeasures()

        const clonedResponse = response.clone()
        let text = await response.text()
        if (text.includes(ngrokHostname))
          text = text.replace(ngrokHttpRegex, 'https$2')

        const metadata = htmlToMetadata(text)
        const { context, frame } = metadata

        // decode frame state for debugging
        try {
          const state = JSON.parse(
            decodeURIComponent(frame.state),
          ).previousState
          if (state)
            if (app.secret)
              frame.debug.state = JSON.parse(await verify(state, app.secret))
            else frame.debug.state = state
        } catch (error) {}

        const [htmlSize, imageSize] = await Promise.all([
          getHtmlSize(clonedResponse),
          getImageSize(frame.imageUrl),
        ])

        const baseUrl = c.req.url.replace('/dev/frame/action', '')
        const routes = getRoutes(baseUrl, inspectRoutes(app.hono))

        // remove serialized context from image/imageUrl to save url space
        // tip: search for `_frog_` to see where it's added back
        const contextString = toSearchParams(context).toString()
        frame.image = frame.image.replace(contextString, '_frog_image')
        frame.imageUrl = frame.imageUrl.replace(contextString, '_frog_imageUrl')

        return c.json({
          data: {
            id: uid(),
            type: 'action',
            method: 'post',
            body,
            context,
            frame,
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
          },
          routes,
        } satisfies PreviewProps)
      },
    )
    .post(
      `${parsePath(path)}/dev/frame/redirect`,
      validator('json', validateFramePostBody),
      async (c) => {
        // TODO: Hono should be able to infer these types
        const vars = c.var as unknown as {
          fid: number
          keypair: { privateKey: string } | undefined
        }

        const json = c.req.valid('json')
        const fid = (json.fid ?? vars.fid) as number
        const body = { ...json, fid }

        let response: Response
        let error: string | undefined
        try {
          const privateKey = vars.keypair?.privateKey
          response = await fetchFrame({ body, privateKey })
        } catch (err) {
          response = {
            ok: false,
            redirected: false,
            status: 500,
            statusText: 'Internal Server Error',
          } as Response
          error = `${(err as Error).cause}`.replace('Error: ', '')
        }

        performance.measure('fetch', 'start', 'end')
        const measure = performance.getEntriesByName('fetch')[0]
        const speed = measure.duration
        performance.clearMarks()
        performance.clearMeasures()

        return c.json({
          id: uid(),
          type: 'redirect',
          method: 'post',
          body,
          metrics: { speed },
          response: response.redirected
            ? {
                success: true,
                location: response.url,
                status: 302,
                statusText: 'Found',
              }
            : {
                success: false,
                error,
                status: response.status,
                statusText: response.statusText,
              },
          timestamp: Date.now(),
        } satisfies PreviewProps['data'])
      },
    )

  /////////////////////////////////////////////////////////////////////////////////////////
  // Auth
  /////////////////////////////////////////////////////////////////////////////////////////

  const cookieOptions = {
    maxAge: 30 * 86_400,
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
      let requestFid: number
      let signature: string
      if (app.dev?.appFid && app.dev?.appMnemonic) {
        const account = mnemonicToAccount(app.dev.appMnemonic)

        deadline = Math.floor(Date.now() / 1000) + 60 * 60 // now + hour
        requestFid = app.dev.appFid
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
            requestFid: BigInt(app.dev.appFid),
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
          requestFid: number
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
      if (app.secret)
        await setSignedCookie(c, 'session', value, app.secret, cookieOptions)
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
        let pfp = undefined
        let username = undefined
        let displayName = undefined
        if (app.hub || app.hubApiUrl) {
          const response = (await fetch(
            `${
              app.hub?.apiUrl || app.hubApiUrl
            }/v1/userDataByFid?fid=${userFid}`,
          ).then((response) => response.json())) as UserDataByFidResponse

          for (const message of response.messages) {
            if (message.data.type !== 'MESSAGE_TYPE_USER_DATA_ADD') continue

            const type = message.data.userDataBody.type
            const value = message.data.userDataBody.value
            if (type === 'USER_DATA_TYPE_PFP') pfp = value
            if (type === 'USER_DATA_TYPE_USERNAME') username = value
            if (type === 'USER_DATA_TYPE_DISPLAY') displayName = value
          }
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
