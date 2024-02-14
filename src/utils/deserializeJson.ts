export function deserializeJson<returnType>(data = '{}'): returnType {
  if (data === 'undefined') return {} as returnType
  return JSON.parse(decodeURIComponent(data))
}
