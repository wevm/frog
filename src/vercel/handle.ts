import { handle as handle_hono } from 'hono/vercel'

import type { FrogBase } from '../frog-base.js'

export function handle<state>(app: FrogBase<state>) {
  return handle_hono(app.hono).bind(app.hono)
}
