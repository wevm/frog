export async function extractFrameMetaTags(
  url: string,
): Promise<Record<string, string>> {
  try {
    const res = await fetch(url)
    const text = await res.text()

    const match = text.matchAll(
      /<meta property="(fc|frog):(\S+)" content="(\S+)"/gm,
    )
    if (!match) return {}

    const metaTags: Record<string, string> = {}
    for (const matchGroup of match) {
      const key = `${matchGroup[1]}:${matchGroup[2]}`
      const value = matchGroup[3]
      metaTags[key] = value
    }

    return metaTags
  } catch (error) {
    throw new Error(`Failed to extract frame meta tags from ${url}: ${error}`)
  }
}
