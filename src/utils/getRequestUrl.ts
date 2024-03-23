import type { Context } from 'hono'

export function getRequestUrl(req: Context['req']) {
  const url = new URL(req.url)
  url.protocol = req.header('x-forwarded-proto') ?? url.protocol
  return url
}
