import { default as lz } from 'lz-string'

export function deserializeJson<returnType>(data = ''): returnType {
  if (data === 'undefined') return {} as returnType
  return JSON.parse(lz.decompressFromEncodedURIComponent(data))
}
