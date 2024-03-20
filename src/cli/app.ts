import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'

import { routes } from '../dev/devtools.js'
import { neynar } from '../hubs/neynar.js'

export const app = new Hono()

app.route(
  '/',
  routes({
    basePath: '',
    hub: neynar({ apiKey: 'NEYNAR_FROG_FM' }),
    publicPath: '.',
    routes: [],
    secret: undefined,
    serveStatic,
  }),
)
