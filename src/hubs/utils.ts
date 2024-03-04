import type { Hub } from '../types/hub.js'

export type CreateHubReturnType<
  parameters extends object | undefined = undefined,
> = parameters extends unknown[]
  ? (...parameters: parameters) => Hub
  : () => Hub

export function createHub<const fn extends (parameters: any) => Hub>(
  fn: fn,
): CreateHubReturnType<Parameters<fn>> {
  return fn as unknown as CreateHubReturnType<Parameters<fn>>
}
