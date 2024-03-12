import { hc } from 'hono/client'

const importMetaUrl = new URL(import.meta.url)
const pathname = importMetaUrl.pathname.replace(/\/assets.*/, '')
const apiUrl = `${importMetaUrl.origin}${pathname}/api`
console.log('client', apiUrl)

type AppType = import('../../src/dev/api.js').ApiRoutes
export const client = hc<AppType>(apiUrl)
