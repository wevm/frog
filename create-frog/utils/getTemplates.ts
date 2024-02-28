import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { default as fs } from 'fs-extra'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function getTemplates() {
  return fs.readdirSync(resolve(__dirname, '../../templates'))
}
