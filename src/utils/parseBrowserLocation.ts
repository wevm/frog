import type { Context } from 'hono'

export function parseBrowserLocation(
  c: Context,
  location_: string | undefined,
  { basePath, path }: { basePath: string; path: string },
) {
  let location = location_ || ''
  if (location?.includes(':path') && !path.includes(':path'))
    location = location.replace(':path', path.replace(/(^\/)|(\/$)/, ''))
  else if (location?.includes(':'))
    for (const [key, value] of Object.entries(c.req.param() as any))
      location = location.replace(`:${key}`, value as string)
  if (location.includes(':basePath'))
    location = location.replace(
      ':basePath',
      basePath.replace(/(^\/)|(\/$)/, ''),
    )
  location = location.replace(/^\/\//, '/')
  return location
}
