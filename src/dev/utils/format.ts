export function formatFileSize(sizeInBytes: number) {
  if (sizeInBytes < 1024) return `${sizeInBytes}b`
  if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(2)}kb`
  return `${(sizeInBytes / (1024 * 1024)).toFixed(2)}mb`
}

export function formatSpeed(speed: number) {
  if (speed < 1000)
    return `${(Math.round((speed + Number.EPSILON) * 100) / 100).toFixed(2)}ms`
  if (speed % 1 === 0) return `${speed / 100}s`
  return `${(speed / 1000).toFixed(2)}s`
}

export function formatTime(time: number) {
  return new Date(time).toLocaleTimeString()
}

export function formatUrl(url: string) {
  const urlObj = new URL(url)
  urlObj.search = ''
  const urlString = urlObj.toString().replace(/https?:\/\//, '')
  return urlString.endsWith('/') ? urlString.slice(0, -1) : urlString
}
