import { Hono } from 'hono'

import { getHtmlSize } from './utils/getHtmlSize.js'
import { getImageSize } from './utils/getImageSize.js'
import { htmlToMetadata } from './utils/htmlToMetadata.js'
import { uid } from './utils/uid.js'

export type ApiRoutesOptions = {
  /** Custom app fid to auth with. */
  appFid?: number | undefined
  /** Custom app mnemonic to auth with. */
  appMnemonic?: string | undefined
}

type Options = ApiRoutesOptions & {
  routes: Route[]
}

type Route = {
  path: string
  method: string
  isMiddleware: boolean
}

export type ApiRoutes = ReturnType<typeof apiRoutes>

const headers = {
  'x-frog-dev': 'true',
} satisfies HeadersInit

export function apiRoutes(options: Options) {
  const { routes } = options

  return new Hono()
    .get('/frames', (c) => {
      const frameRoutes = getFrameRoutes(routes)
      return c.json(frameRoutes)
    })
    .get('/frames/:route', async (c) => {
      const route = c.req.param('route')
      const url = new URL(c.req.url)
      const frameUrl = `${url.origin}${route}`
      const initialData = await getInitialData(frameUrl)
      return c.json(initialData)
    })
}

export function getFrameRoutes(routes: Route[]) {
  const frameRoutes: string[] = []
  for (const route of routes) {
    if (route.isMiddleware) continue
    if (route.method !== 'ALL') continue
    frameRoutes.push(route.path)
  }
  return frameRoutes
}

export async function getInitialData(frameUrl: string) {
  const t0 = performance.now()
  const response = await fetch(frameUrl, {
    headers,
  })
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

  const id = uid()
  const timestamp = Date.now()
  const { status, statusText } = response

  return {
    id,
    timestamp,
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
      status,
      statusText,
    },
  } as const
}
