import type { Schema } from 'hono'

import type { FrogBase } from '../frog-base.js'
import type { Env } from '../types/env.js'
import {
  type DevtoolsOptions,
  type ServeStatic,
  devtools as devtools_base,
} from './devtools.js'
import { getUiRoot } from './utils/getUiRoot.js'

const root = await getUiRoot()

/**
 * Built-in devtools with live preview, hot reload, time-travel debugging, and more.
 *
 * @see https://frog.fm/dev/devtools
 */
export function devtools<
  env extends Env,
  schema extends Schema,
  basePath extends string,
  serveStatic extends ServeStatic,
  ///
  state = env['State'],
>(
  frog: FrogBase<env, schema, basePath, state>,
  options?: DevtoolsOptions<serveStatic> | undefined,
) {
  devtools_base(frog, { ...options, root })
}
