import type { Hono } from 'hono'
import { inspectRoutes } from 'hono/dev'
import type { ParamIndexMap, Params } from 'hono/router'
import type { BlankSchema, Env, H, RouterRoute } from 'hono/types'

export function getIsHandlerPresentAtPath<env extends Env>(
  path: string,
  hono: Hono<env, BlankSchema, '/'>,
) {
  const routes = inspectRoutes(hono)
  const matchesWithoutParamsStash = hono.router
    .match('GET', path)
    .filter(
      (routeOrParams) => typeof routeOrParams[0] !== 'string',
    ) as unknown as (
    | [[H, RouterRoute], Params][]
    | [[H, RouterRoute], ParamIndexMap][]
  )[]

  const matchedRoutes = matchesWithoutParamsStash
    .flat(1)
    .map((matchedRouteWithoutParams) => matchedRouteWithoutParams[0][1])

  const nonMiddlewareMatchedRoutes = matchedRoutes.filter((matchedRoute) => {
    const routeWithAdditionalInfo = routes.find(
      (route) =>
        route.path === matchedRoute.path &&
        route.method === matchedRoute.method,
    )
    if (!routeWithAdditionalInfo)
      throw new Error(
        'Unexpected error: Matched a route that is not in the list of all routes.',
      )
    return !routeWithAdditionalInfo.isMiddleware
  })
  return nonMiddlewareMatchedRoutes.length !== 0
}
