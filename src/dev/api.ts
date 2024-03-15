import { Hono } from 'hono'
import type { hc, InferResponseType } from 'hono/client'
import { ed25519 } from '@noble/curves/ed25519'
import { bytesToHex } from '@noble/curves/abstract/utils'
import {
  deleteCookie,
  getCookie,
  getSignedCookie,
  setCookie,
  setSignedCookie,
} from 'hono/cookie'
import { vValidator as validator } from '@hono/valibot-validator'

import { getHtmlSize } from './utils/getHtmlSize.js'
import { getImageSize } from './utils/getImageSize.js'
import { htmlToMetadata } from './utils/htmlToMetadata.js'
import { uid } from './utils/uid.js'
import { fetchFrame } from './utils/fetchFrame.js'
import {
  defaultCookieOptions,
  defaultFid,
  defaultHeaders,
} from './constants.js'
import {
  getSignedKeyRequest,
  getSignedKeyRequestForToken,
  getUserDataByFid,
  postSignedKeyRequest,
} from './utils/warpcast.js'
import { postSchema } from './schemas.js'

export type ApiRoutesOptions = {
  /** Custom app fid to auth with. */
  appFid?: number | undefined
  /** Custom app mnemonic to auth with. */
  appMnemonic?: string | undefined
}

type Options = ApiRoutesOptions & {
  hubApiUrl?: string | undefined
  routes: Route[]
  secret?: string | undefined
}

type Route = {
  path: string
  method: string
  isMiddleware: boolean
}

export type User = {
  displayName?: string | undefined
  pfp?: string | undefined
  state: 'completed'
  token: string
  userFid: number
  username?: string | undefined
}

export function apiRoutes(options: Options) {
  const { appFid, appMnemonic, hubApiUrl, routes, secret } = options

  return new Hono<{
    Variables: {
      fid: number | undefined
      keypair: { publicKey: string; privateKey: string } | undefined
    }
  }>()
    .use('*', async (c, next) => {
      const userCookie = getCookie(c, 'user')
      const fid = userCookie ? JSON.parse(userCookie).userFid : undefined
      c.set('fid', fid)

      const sessionCookie = secret
        ? await getSignedCookie(c, secret, 'session')
        : getCookie(c, 'session')
      const keypair = sessionCookie ? JSON.parse(sessionCookie) : undefined
      c.set('keypair', keypair)

      await next()
    })
    .get('/frames', (c) => {
      const url = new URL(c.req.url)
      const frameUrls = getFrameUrls(url.origin, routes)
      return c.json(frameUrls)
    })
    .get('/frames/:url', async (c) => {
      const url = decodeURIComponent(c.req.param('url'))
      const initialData = await getInitialData(url)
      return c.json(initialData)
    })
    .post('/frames/:url/action', validator('json', postSchema), async (c) => {
      const url = decodeURIComponent(c.req.param('url'))

      const json = c.req.valid('json')
      const fid = json.fid ?? c.var.fid ?? defaultFid
      const body = { ...json, fid }
      const response = await fetchFrame({
        body,
        privateKey: c.var.keypair?.privateKey,
        url,
      })

      const cloned = response.clone()
      const text = await response.text()
      const metadata = htmlToMetadata(text)
      const { context, frame } = metadata

      const sizes = await Promise.all([
        getHtmlSize(cloned),
        getImageSize(frame.imageUrl),
      ])

      return c.json({
        id: uid(),
        timestamp: Date.now(),
        type: 'action',
        method: 'post',
        body,
        context,
        frame,
        metrics: {
          htmlSize: sizes[0],
          imageSize: sizes[1],
          speed: response.speed,
        },
        response: {
          success: true,
          status: response.status,
          statusText: response.statusText,
        },
        url,
      } as const)
    })
    .post('/frames/:url/redirect', validator('json', postSchema), async (c) => {
      const url = decodeURIComponent(c.req.param('url'))

      const json = c.req.valid('json')
      const fid = json.fid ?? c.var.fid ?? defaultFid
      const body = { ...json, fid }

      // TODO: Handle redirect error
      const error: string | undefined = undefined
      const response = await fetchFrame({
        body,
        privateKey: c.var.keypair?.privateKey,
        url,
      })

      return c.json({
        id: uid(),
        timestamp: Date.now(),
        type: 'redirect',
        method: 'post',
        body,
        metrics: {
          speed: response.speed,
        },
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
        url,
      } as const)
    })
    .get('/auth/code', async (c) => {
      // 1. Create keypair
      const privateKeyBytes = ed25519.utils.randomPrivateKey()
      const publicKeyBytes = ed25519.getPublicKey(privateKeyBytes)
      const privateKey = `0x${bytesToHex(privateKeyBytes)}`
      const publicKey = `0x${bytesToHex(publicKeyBytes)}` as const

      // 2. Sign key request. By default, use hosted service.
      const { deadline, requestFid, signature } = await getSignedKeyRequest({
        appFid,
        appMnemonic,
        publicKey,
      })

      // 3. Create key request to register public key
      const response = await postSignedKeyRequest({
        deadline,
        publicKey,
        requestFid,
        signature,
      })
      const { token, deeplinkUrl: url } = response.result.signedKeyRequest

      // 4. Save keypair in cookie
      const value = JSON.stringify({ privateKey, publicKey })
      if (secret)
        await setSignedCookie(c, 'session', value, secret, defaultCookieOptions)
      else
        setCookie(c, 'session', value, {
          ...defaultCookieOptions,
          httpOnly: true,
        })

      return c.json({ token, url })
    })
    .get('/auth/status/:token', async (c) => {
      const token = c.req.param('token')
      const response = await getSignedKeyRequestForToken(token)
      const { state = 'pending', userFid } =
        response.result?.signedKeyRequest ?? {}

      if (state === 'completed') {
        let user: User = { state, token, userFid: userFid as number }
        if (hubApiUrl && userFid) {
          const data = await getUserDataByFid(hubApiUrl, userFid)
          user = { ...user, ...data }
        }

        setCookie(
          c,
          'user',
          JSON.stringify({ token, userFid }),
          defaultCookieOptions,
        )
        return c.json(user)
      }

      return c.json({ state })
    })
    .post('/auth/logout', async (c) => {
      deleteCookie(c, 'session')
      deleteCookie(c, 'user')
      return c.json({ success: true })
    })
}

export type ApiRoutes = ReturnType<typeof apiRoutes>

type Client = ReturnType<typeof hc<ApiRoutes>>

export type Data =
  | InferResponseType<Client['frames'][':url']['$get']>
  | InferResponseType<Client['frames'][':url']['action']['$post']>
  | (InferResponseType<Client['frames'][':url']['redirect']['$post']> &
      Pick<
        InferResponseType<Client['frames'][':url']['$get']>,
        'context' | 'frame'
      >)

export type Bootstrap = {
  data: Data | undefined
  frameUrls: string[]
  user: User | undefined
}

export function getFrameUrls(origin: string, routes: Route[]) {
  const frameUrls: string[] = []
  for (const route of routes) {
    if (route.isMiddleware) continue
    if (route.method !== 'ALL') continue
    frameUrls.push(`${origin}${route.path}`)
  }
  return frameUrls
}

export async function getInitialData(frameUrl: string) {
  const t0 = performance.now()
  const response = await fetch(frameUrl, { headers: defaultHeaders })
  const t1 = performance.now()
  const speed = t1 - t0

  const cloned = response.clone()
  const text = await response.text()
  const metadata = htmlToMetadata(text)
  const { context, frame } = metadata

  const sizes = await Promise.all([
    getHtmlSize(cloned),
    getImageSize(frame.imageUrl),
  ])

  return {
    id: uid(),
    timestamp: Date.now(),
    type: 'initial',
    method: 'get',
    context,
    frame,
    metrics: {
      htmlSize: sizes[0],
      imageSize: sizes[1],
      speed,
    },
    response: {
      success: true,
      status: response.status,
      statusText: response.statusText,
    },
    url: frameUrl,
  } as const
}
