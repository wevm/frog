import type { Context } from 'hono'

export function getRequestUrl(req: Context['req']) {
  const url = new URL(req.url)
  const forwardedHost = req.header('x-forwarded-host')
  url.host = forwardedHost ?? url.host
  url.protocol = req.header('x-forwarded-proto') ?? url.protocol
  if (forwardedHost !== undefined && !forwardedHost.startsWith('localhost'))
    url.port = ''
  return url
}
