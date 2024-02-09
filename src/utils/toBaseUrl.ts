export function toBaseUrl(url: string) {
  return new URL(url).origin
}
