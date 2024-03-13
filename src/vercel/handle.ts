import type { Schema } from 'hono'
import { handle as handle_hono } from 'hono/vercel'

import type { Frog } from '../frog.js'
import type { Env } from '../types/env.js'

export function handle<
  env extends Env,
  schema extends Schema,
  basePath extends string,
  //
  _state = env['State'],
>(app: Frog<env, schema, basePath, _state>) {
  return handle_hono(app.hono).bind(app.hono)
}
