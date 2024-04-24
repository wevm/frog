export function parsePath(path_: string): string {
  let path = path_.split('?')[0]!
  if (path.endsWith('/')) path = path.slice(0, -1)
  return path
}
