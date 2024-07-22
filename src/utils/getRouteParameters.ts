import type { RouteOptions } from '../frog-base.js'
import type { Env } from '../types/env.js'
import type { MiddlewareHandler } from '../types/routes.js'

export function getRouteParameters<
  env extends Env,
  handler,
  method extends string,
>(
  ...parameters: any[]
): [
  string,
  MiddlewareHandler<env>[],
  handler,
  method extends 'castAction' | 'composerAction'
    ? RouteOptions<method>
    : RouteOptions<method> | undefined,
] {
  const options: method extends 'castAction' | 'composerAction'
    ? RouteOptions<method>
    : RouteOptions<method> | undefined =
    typeof parameters[parameters.length - 1] === 'object'
      ? parameters[parameters.length - 1]
      : undefined

  const middlewares = [] as MiddlewareHandler<env>[]
  let handler: handler | undefined
  for (let i = parameters.length - (options ? 2 : 1); i > 0; i--) {
    if (!handler) handler = parameters[i]
    else middlewares.push(parameters[i])
  }

  return [parameters[0], middlewares, handler!, options] as const
}
