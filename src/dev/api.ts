import { vValidator as validator } from '@hono/valibot-validator'
import { bytesToHex } from '@noble/curves/abstract/utils'
import { ed25519 } from '@noble/curves/ed25519'
import { Hono } from 'hono'
import type { InferResponseType, hc } from 'hono/client'
import {
  deleteCookie,
  getCookie,
  getSignedCookie,
  setCookie,
  setSignedCookie,
} from 'hono/cookie'
import type { inspectRoutes } from 'hono/dev'
import { HTTPException } from 'hono/http-exception'

import { object, parse, union } from 'valibot'
import type { Hub } from '../types/hub.js'
import type { TransactionResponse } from '../types/transaction.js'
import {
  defaultCookieOptions,
  defaultFid,
  defaultHeaders,
} from './constants.js'
import { postSchema } from './schemas.js'
import { fetchFrame } from './utils/fetchFrame.js'
import { getHtmlSize } from './utils/getHtmlSize.js'
import { getImageSize } from './utils/getImageSize.js'
import { htmlToMetadata } from './utils/htmlToMetadata.js'
import { responseToBaseErrorMessage } from './utils/responseToBaseErrorMessage.js'
import { uid } from './utils/uid.js'
import {
  getSignedKeyRequest,
  getSignedKeyRequestForToken,
  getUserDataByFid,
  postSignedKeyRequest,
} from './utils/warpcast.js'

export type ApiRoutesOptions = {
  /** Custom app fid to auth with. */
  appFid?: number | undefined
  /** Custom app mnemonic to auth with. */
  appMnemonic?: string | undefined
}

export type RouteData = ReturnType<typeof inspectRoutes>[number]

export type User = {
  displayName?: string | undefined
  pfp?: string | undefined
  state: 'completed'
  token: string
  userFid: number
  username?: string | undefined
}

export function apiRoutes(
  options: ApiRoutesOptions & {
    hub: Hub | undefined
    routes: RouteData[]
    secret: string | undefined
  },
) {
  const { appFid, appMnemonic, hub, routes, secret } = options

  return new Hono<{
    Variables: {
      fid: number | undefined
      keypair: { publicKey: string; privateKey: string } | undefined
    }
  }>()
    .use('*', async (c, next) => {
      try {
        const userCookie = getCookie(c, 'frog_user') ?? getCookie(c, 'user')
        const fid = userCookie ? JSON.parse(userCookie).userFid : undefined
        c.set('fid', fid)
      } catch {}

      try {
        const sessionCookie = secret
          ? (await getSignedCookie(c, secret, 'frog_session')) ??
            (await getSignedCookie(c, secret, 'session'))
          : getCookie(c, 'frog_session') ?? getCookie(c, 'session')
        const keypair = sessionCookie ? JSON.parse(sessionCookie) : undefined
        c.set('keypair', keypair)
      } catch {}

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
      const { response, speed } = await fetchFrame({
        body,
        privateKey: c.var.keypair?.privateKey,
        url,
      })
      if (!response) throw new Error('Failed to fetch frame')

      const cloned = response.clone()

      if (!response.ok) {
        const message = await responseToBaseErrorMessage(cloned)
        return c.json({
          id: uid(),
          timestamp: Date.now(),
          type: 'error',
          method: 'post',
          body,
          metrics: {
            speed,
          },
          response: {
            success: false,
            error: message,
            status: response.status,
            statusText: response.statusText,
          },
          url,
        } as const)
      }

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
          speed: speed,
        },
        response: {
          success: true,
          error: undefined,
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

      const { error, response, speed } = await fetchFrame({
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
          speed,
        },
        response: response?.redirected
          ? {
              success: true,
              location: response.url,
              error: undefined,
              status: 302,
              statusText: 'Found',
            }
          : {
              success: false,
              error: error?.cause
                ? `${error.cause}`.replace('Error: ', '')
                : error?.message,
              status: response?.status ?? 500,
              statusText: response?.statusText ?? 'Internal Server Error',
            },
        sourceFrameId: json.sourceFrameId,
        url,
      } as const)
    })
    .post('/frames/:url/tx', validator('json', postSchema), async (c) => {
      const url = decodeURIComponent(c.req.param('url'))

      const json = c.req.valid('json')
      const fid = json.fid ?? c.var.fid ?? defaultFid
      const body = { ...json, fid }

      const { response, speed } = await fetchFrame({
        body,
        privateKey: c.var.keypair?.privateKey,
        url,
      })
      // TODO: Handle errors
      if (!response) throw new Error('Failed to fetch frame')

      const cloned = response.clone()

      if (!response.ok) {
        const message = await responseToBaseErrorMessage(cloned)
        return c.json({
          id: uid(),
          timestamp: Date.now(),
          type: 'error',
          method: 'post',
          body,
          metrics: {
            speed,
          },
          response: {
            success: false,
            error: message,
            status: response.status,
            statusText: response.statusText,
          },
          url,
        } as const)
      }

      const data = (await response.json()) as TransactionResponse

      return c.json({
        id: uid(),
        timestamp: Date.now(),
        type: 'tx',
        method: 'post',
        body,
        metrics: {
          speed,
        },
        response: {
          success: true,
          data,
          error: undefined,
          status: response.status,
          statusText: response.statusText,
        },
        sourceFrameId: json.sourceFrameId,
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
        await setSignedCookie(
          c,
          'frog_session',
          value,
          secret,
          defaultCookieOptions,
        )
      else
        setCookie(c, 'frog_session', value, {
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
        if (hub && userFid) {
          const data = await getUserDataByFid(hub, userFid)
          user = { ...user, ...data }
        }

        setCookie(
          c,
          'frog_user',
          JSON.stringify({ token, userFid }),
          defaultCookieOptions,
        )
        return c.json(user)
      }

      return c.json({ state })
    })
    .post('/auth/logout', async (c) => {
      deleteCookie(c, 'frog_session')
      deleteCookie(c, 'frog_user')
      return c.json({ success: true })
    })
    .post(
      '/debug/image/:url',
      validator('json', union([object({}), postSchema])),
      async (c) => {
        const url = decodeURIComponent(c.req.param('url'))

        let text: string | undefined
        const body = await c.req.json()
        const hasBody = Object.keys(body).length > 0
        const headers = {
          ...defaultHeaders,
          Accept: 'text/html',
        }
        if (hasBody) {
          const json = parse(postSchema, body)
          const params = {
            body: { ...json, fid: json.fid ?? c.var.fid ?? defaultFid },
            headers,
            privateKey: c.var.keypair?.privateKey,
            url,
          }
          text = await fetchFrame(params)
            .then((result) => result.response)
            .then((response) => response?.text())
        } else
          text = await fetch(url, { headers }).then((response) =>
            response.text(),
          )

        if (!text) throw new HTTPException(500, { message: 'Failed to fetch' })
        return c.html(text)
      },
    )
}

export type ApiRoutes = ReturnType<typeof apiRoutes>

type Client = ReturnType<typeof hc<ApiRoutes>>

export type Data =
  | InferResponseType<Client['frames'][':url']['$get']>
  | Extract<
      InferResponseType<Client['frames'][':url']['action']['$post']>,
      { type: 'action' }
    >
  | (InferResponseType<Client['frames'][':url']['redirect']['$post']> &
      BaseData)
  | (Extract<
      InferResponseType<Client['frames'][':url']['tx']['$post']>,
      { type: 'tx' }
    > &
      BaseData)

type BaseData = Pick<
  InferResponseType<Client['frames'][':url']['$get']>,
  'context' | 'frame'
>

export type Bootstrap = {
  data: Data | undefined
  frameUrls: string[]
  user: User | undefined
}

export function getFrameUrls(origin: string, routes: RouteData[]) {
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

  // Vercel requires authentication by default for preview deployments
  if (text.includes('Authentication Required') && text.includes('vercel'))
    throw new HTTPException(401, {
      message:
        'Vercel Authentication blocked Frog Devtools\nLearn more: https://vercel.com/docs/security/deployment-protection',
    })

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
      error: undefined,
      status: response.status,
      statusText: response.statusText,
    },
    url: frameUrl,
  } as const
}
