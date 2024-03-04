import { inspectRoutes } from 'hono/dev'

export function getRoutes(
  baseUrl: string,
  routes: ReturnType<typeof inspectRoutes>,
) {
  // corrects route paths for `app.route(...)` routes
  const pathname = new URL(baseUrl).pathname
  let basePathname = '/'
  for (const route of routes) {
    if (route.path === '/') {
      basePathname = pathname
    } else {
      const normalizedPathname = pathname.replace(route.path, '')
      if (normalizedPathname === pathname) continue
      basePathname = normalizedPathname
    }
  }

  const frameRoutes = []
  if (basePathname !== '' && basePathname !== '/') frameRoutes.push('/')

  for (const route of routes) {
    if (route.isMiddleware) continue
    if (route.method !== 'ALL') continue

    let path: string
    if (basePathname !== '' && route.path === '/') path = basePathname
    else path = (basePathname === '/' ? '' : basePathname) + route.path
    frameRoutes.push(path)
  }

  return frameRoutes
}
