import path from 'node:path'
import { glob } from 'fast-glob'
import { IconifyJSONIconsData } from '@iconify/types'

console.log('Copying icons to package.')

const collectionSet = new Set(['heroicons', 'lucide', 'radix-icons', 'logos'])

const collections = (await glob('**/@iconify/json/json/*.json'))
  .map((collectionPath) => {
    const filename = path.basename(collectionPath)
    const ext = path.extname(filename)
    const name = filename.slice(0, -ext.length)
    return { name, path: collectionPath }
  })
  .filter((collection) => collectionSet.has(collection.name))

let count = 0
const iconMap = {}
for (const collection of collections) {
  const file = Bun.file(collection.path)
  const json = (await file.json()) as IconifyJSONIconsData
  iconMap[json.prefix] = json
  console.log(collection.name)
  count += 1
}

const dist = path.resolve(import.meta.dirname, '../src/ui')
await Bun.write(
  `${dist}/icons.ts`,
  `export const icons = ${JSON.stringify(iconMap, null, 2)} as const\n`,
)

console.log(
  `Done. Copied ${count} ${count === 1 ? 'collection' : 'collections'}.`,
)
