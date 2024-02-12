import { default as lz } from 'lz-string'

export function serializeJson(data: unknown = {}) {
  return lz.compressToEncodedURIComponent(JSON.stringify(data))
}
