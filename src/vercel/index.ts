import { handle as handle_hono } from 'hono/vercel'

import type { FarcBase } from '../farc-base.js'

export function handle(app: FarcBase) {
  return handle_hono(app.hono).bind(app.hono)
}
