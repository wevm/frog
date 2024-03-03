import { serveStatic as serveStatic_ } from 'hono/cloudflare-workers'

export const serveStatic: typeof serveStatic_ = (parameters) =>
  serveStatic_({
    ...parameters,
    // @ts-expect-error
    manifest: import('__STATIC_CONTENT_MANIFEST'),
  })
