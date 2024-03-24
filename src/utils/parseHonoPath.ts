export function parseHonoPath(path: string) {
  if (path.endsWith('/')) return path.slice(0, -1)
  return path
}
