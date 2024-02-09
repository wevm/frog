import { compressToEncodedURIComponent } from 'lz-string'

export function serializeJson(data: unknown = {}) {
  return compressToEncodedURIComponent(JSON.stringify(data))
}
