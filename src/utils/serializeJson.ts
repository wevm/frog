export function serializeJson(data: unknown = {}) {
  return encodeURIComponent(JSON.stringify(data))
}
