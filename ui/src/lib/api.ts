import { hc } from 'hono/client'

import { baseUrl } from '../constants.js'

type Route = import('../../../src/dev/api.js').ApiRoutes
export const client = hc<Route>(`${baseUrl}/api`)

export type Client = typeof client
