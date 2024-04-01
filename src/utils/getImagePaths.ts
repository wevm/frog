export function getImagePaths(path: string) {
  const imagePaths: string[] = []
  const pathParts = path.split('/')

  // skip the first split result as it's empty
  for (let i = 1; i < pathParts.length; i++) {
    if (!pathParts[i]?.startsWith(':') || !pathParts[i]?.endsWith('?')) continue
    imagePaths.push(`${pathParts.slice(0, i).join('/')}/image`)
  }
  imagePaths.push(`${path}/image`)
  return imagePaths
}
