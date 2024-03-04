export async function getHtmlSize(response: Response) {
  const blob = await response.blob()
  return blob.size
}
