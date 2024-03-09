export async function getImageSize(url: string) {
  const response = await fetch(url)
  const blob = await response.blob()
  return blob.size
}
