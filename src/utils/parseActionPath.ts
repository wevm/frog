import { resolve } from 'url'
import { parsePath } from './parsePath.js'

export function parseActionPath(baseUrl: string, action: string) {
  return parsePath(resolve(baseUrl, parsePath(action)))
}
