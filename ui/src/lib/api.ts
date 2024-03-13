import { hc } from 'hono/client'

declare const __FROG_BASE_URL__: string
const apiUrl = `${__FROG_BASE_URL__}/api`

type Route = import('../../../src/dev/api.js').ApiRoutes
export const client = hc<Route>(apiUrl)
