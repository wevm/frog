import path from 'node:path'
import { IconifyJSONIconsData } from '@iconify/types'
import { getIconData, iconToHTML, iconToSVG } from '@iconify/utils'
import { encodeSvgForCss } from '@iconify/utils/lib/svg/encode-svg-for-css'
import { glob } from 'fast-glob'

console.log('Copying icons to package.')

const collectionSet = new Set(['heroicons', 'lucide', 'radix-icons'])

const collections = (await glob('**/@iconify/json/json/*.json'))
  .map((collectionPath) => {
    const filename = path.basename(collectionPath)
    const ext = path.extname(filename)
    const name = filename.slice(0, -ext.length)
    return { name, path: collectionPath }
  })
  .filter((collection) => collectionSet.has(collection.name))

const iconMap: Record<string, Record<string, string>> = {}
for (const collection of collectionSet) {
  iconMap[collection] = {}
}

let count = 0
for (const collection of collections) {
  const file = Bun.file(collection.path)
  const json = (await file.json()) as IconifyJSONIconsData

  for (const key of Object.keys(json.icons)) {
    const item = getIconData(json, key)
    if (!item) throw new TypeError(`Invalid icon: ${key}`)
    const svg = iconToSVG(item)
    const text = iconToHTML(svg.body, svg.attributes)
    iconMap[collection.name][key] = encodeSvgForCss(text)
  }

  console.log(collection.name)
  count += 1
}

const iconsExport = `export const icons = ${JSON.stringify(iconMap, null, 2)}`
const dist = path.resolve(import.meta.dirname, '../src/ui')
await Bun.write(`${dist}/icons.ts`, `${iconsExport}\n`)

console.log(
  `Done. Copied ${count} ${count === 1 ? 'collection' : 'collections'}.`,
)
