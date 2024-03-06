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
import { verify } from '../utils/jws.js'
import { parsePath } from '../utils/parsePath.js'
import { toSearchParams } from '../utils/toSearchParams.js'
import { App } from './components/App.js'
import { type Props, Provider, dataId } from './lib/context.js'
import {
  type ActionData,
  type BaseData,
  type RedirectData,
  type SignedKeyRequestResponse,
  type User,
  type UserDataByFidResponse,
} from './types.js'
import { fetchFrame } from './utils/fetchFrame.js'
import { getHtmlSize } from './utils/getHtmlSize.js'
import { getImageSize } from './utils/getImageSize.js'
import { getRoutes } from './utils/getRoutes.js'
import { htmlToFrame } from './utils/htmlToFrame.js'
import { htmlToContext } from './utils/htmlToState.js'
import { uid } from './utils/uid.js'
import { validateFramePostBody } from './utils/validateFramePostBody.js'

declare module 'hono' {
  interface ContextRenderer {
    (
      content: string | Promise<string>,
      props?: {
        title: string
        value: Props
      },
    ): Response
  }
}

export function routes<
  state,
  env extends Env,
  schema extends Schema,
  basePath extends string,
>(app: FrogBase<state, env, schema, basePath>, path: string) {
  app.get(
    `${parsePath(path)}/dev2`,
    jsxRenderer((props) => {
      const { children, value, title } = props
      return (
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1.0"
            />
            <title>{title}</title>
            <link
              rel="stylesheet"
              href="/node_modules/frog/dev2/client/styles.css"
            />
            {/* TODO: Load from file system */}
            <link rel="preconnect" href="https://rsms.me/" />
            <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
            <link rel="icon" href="https://frog.fm/icon.png" type="image/png" />
          </head>
          <body>
            <div id="root">{children}</div>
            <script type="module" src="/node_modules/frog/dev2/client" />
            <script
              id={dataId}
              type="application/json"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
              dangerouslySetInnerHTML={{ __html: JSON.stringify(value) }}
            />
          </body>
        </html>
      )
    }),
    async (c) => {
      const url = c.req.url.replace('/dev2', '')
      const value = await get(url)
      const cookie = getCookie(c, 'user')

      let user: User | undefined = undefined
      if (cookie)
        try {
          const parsed = JSON.parse(cookie)
          const baseUrl = app.hub?.apiUrl || app.hubApiUrl
          if (parsed && baseUrl) {
            const data = await getUserByFid(baseUrl, parsed.userFid)
            user = { state: 'completed', ...parsed, ...data }
          }
        } catch {}

      return c.render(
        <Provider {...value} user={user}>
          <App />
        </Provider>,
        { title: `frame: ${new URL(url).pathname}`, value: { ...value, user } },
      )
    },
  )

  app.get(`${parsePath(path)}/dev2/frame`, async (c) => {
    const url = c.req.url.replace('/dev2/frame', '')
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

    const frame = htmlToFrame(text)
    const context = htmlToContext(text)

    // remove serialized context from image/imageUrl to save url space
    // tip: search for `_frog_` to see where it's added back
    const contextString = toSearchParams(context).toString()
    frame.image = frame.image.replace(contextString, '_frog_image')
    frame.imageUrl = frame.imageUrl.replace(contextString, '_frog_imageUrl')

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
      getImageSize(text),
    ])
    const routes = getRoutes(url, inspectRoutes(app.hono))

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
    } satisfies Props
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
      `${parsePath(path)}/dev2/frame/action`,
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

        const frame = htmlToFrame(text)
        const context = htmlToContext(text)

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

        // remove serialized context from image/imageUrl to save url space
        // tip: search for `_frog_` to see where it's added back
        const contextString = toSearchParams(context).toString()
        frame.image = frame.image.replace(contextString, '_frog_image')
        frame.imageUrl = frame.imageUrl.replace(contextString, '_frog_imageUrl')

        const [htmlSize, imageSize] = await Promise.all([
          getHtmlSize(clonedResponse),
          getImageSize(text),
        ])

        const baseUrl = c.req.url.replace('/dev2/frame/action', '')
        const routes = getRoutes(baseUrl, inspectRoutes(app.hono))

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
        } satisfies {
          data: BaseData & ActionData
          routes: string[]
        })
      },
    )
    .post(
      `${parsePath(path)}/dev2/frame/redirect`,
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
        } satisfies BaseData & RedirectData)
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
    .get(`${parsePath(path)}/dev2/frame/auth/code`, async (c) => {
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

      // 4. Save keypair in cookie
      const value = JSON.stringify({ privateKey, publicKey })
      if (app.secret)
        await setSignedCookie(c, 'session', value, app.secret, cookieOptions)
      else setCookie(c, 'session', value, { ...cookieOptions, httpOnly: true })

      return c.json({ token, url })
    })
    .get(`${parsePath(path)}/dev2/frame/auth/status/:token`, async (c) => {
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

      if (state === 'completed' && userFid) {
        let user: User = { state, token, userFid }
        const baseUrl = app.hub?.apiUrl || app.hubApiUrl
        if (baseUrl) {
          const data = await getUserByFid(baseUrl, userFid)
          user = { ...user, ...data }
        }

        setCookie(c, 'user', JSON.stringify({ token, userFid }), cookieOptions)
        return c.json(user)
      }

      return c.json({ state })
    })
    .post(`${parsePath(path)}/dev2/frame/auth/logout`, async (c) => {
      deleteCookie(c, 'session')
      deleteCookie(c, 'user')
      return c.json({ success: true })
    })
}

async function getUserByFid(baseUrl: string, userFid: number) {
  const response = (await fetch(
    `${baseUrl}/v1/userDataByFid?fid=${userFid}`,
  ).then((response) => response.json())) as UserDataByFidResponse

  let displayName = undefined
  let pfp = undefined
  let username = undefined

  for (const message of response.messages) {
    if (message.data.type !== 'MESSAGE_TYPE_USER_DATA_ADD') continue

    const type = message.data.userDataBody.type
    const value = message.data.userDataBody.value
    if (type === 'USER_DATA_TYPE_PFP') pfp = value
    if (type === 'USER_DATA_TYPE_USERNAME') username = value
    if (type === 'USER_DATA_TYPE_DISPLAY') displayName = value
  }

  return { displayName, pfp, userFid, username }
}
