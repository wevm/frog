import { resolve } from 'node:path'
import { default as fs } from 'fs-extra'

export function getTemplates() {
  return fs.readdirSync(resolve(import.meta.dirname, '../../../templates'))
}
