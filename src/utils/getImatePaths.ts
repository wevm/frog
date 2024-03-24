export function getImagePaths(path: string) {
  const imagePaths: string[] = []
  const pathParts = path.split('/').slice(1) // drop the first split result as it's empty

  for (let i = 0; i < pathParts.length; i++) {
    // if the split string starts with `:`, it is a path parameter
    if (pathParts[i].startsWith(':'))
      imagePaths.push(`/${pathParts.slice(0, i).join('/')}image`)
  }
  imagePaths.push(`${path}/image`)
  return imagePaths
}
