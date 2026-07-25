import fs from 'node:fs/promises'
import path from 'node:path'
import { z } from 'incur'
import * as Config from '../src/Config.js'

const root = path.join(import.meta.dirname, '..')

// `io: 'input'` emits the written shape, where every field is optional. That is what a user's
// `config.json` is validated against, and what makes `$schema` useful in an editor.
const schema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'frictionsets config',
  ...z.toJSONSchema(Config.Schema, { io: 'input', target: 'draft-7' }),
}

await fs.writeFile(path.join(root, 'schema.json'), `${JSON.stringify(schema, null, 2)}\n`, 'utf8')
