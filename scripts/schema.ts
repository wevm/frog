import fs from 'node:fs/promises'
import path from 'node:path'
import { z } from 'incur'
import * as Config from '../src/Config.js'

const root = path.join(import.meta.dirname, '..')

// `io: 'input'` emits the written shape, where every field is optional. That is what a document on
// disk is validated against, and what makes `$schema` useful in an editor.
const schemas = [{ file: 'schema.json', schema: Config.Schema, title: 'frog config' }] as const

for (const { file, schema, title } of schemas) {
  const json = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title,
    ...z.toJSONSchema(schema, { io: 'input', target: 'draft-7' }),
  }
  await fs.writeFile(path.join(root, file), `${JSON.stringify(json, null, 2)}\n`, 'utf8')
}
