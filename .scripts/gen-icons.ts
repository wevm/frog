import path from 'node:path'
import type { IconifyJSONIconsData } from '@iconify/types'
import { camelize, getIconData, iconToHTML, iconToSVG } from '@iconify/utils'
import { glob } from 'fast-glob'
import { ensureDir } from 'fs-extra'

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

const iconCollectionExports: string[] = []
let count = 0
for (const collection of collections) {
  const file = Bun.file(collection.path)
  const json = (await file.json()) as IconifyJSONIconsData

  const iconMap: Record<string, string> = {}
  for (const key of Object.keys(json.icons)) {
    const item = getIconData(json, key)
    if (!item) throw new TypeError(`Invalid icon: ${key}`)
    const svg = iconToSVG(item)
    const text = iconToHTML(svg.body, svg.attributes)
    iconMap[key] = encodeURIComponent(text)
  }

  const iconsContent = `export const ${camelize(
    collection.name,
  )} = ${JSON.stringify(iconMap, null, 2)}`
  const iconsDist = path.resolve(
    import.meta.dirname,
    `../src/ui/icons/${collection.name}`,
  )
  await ensureDir(iconsDist)
  await Bun.write(`${iconsDist}/index.ts`, `${iconsContent}\n`)

  const proxyPackageContent = JSON.stringify(
    {
      type: 'module',
      types: `../../_lib/ui/icons/${collection.name}/index.d.ts`,
      module: `../../_lib/ui/icons/${collection.name}/index.js`,
    },
    null,
    2,
  )
  await Bun.write(`${iconsDist}/package.json`, proxyPackageContent)

  iconCollectionExports.push(
    `export { ${camelize(collection.name)} } from './${
      collection.name
    }/index.js'`,
  )

  console.log(collection.name)
  count += 1
}

const dist = path.resolve(import.meta.dirname, '../src/ui/icons')
await Bun.write(`${dist}/index.ts`, `${iconCollectionExports.join('\n')}\n`)

console.log(
  `Done. Copied ${count} ${count === 1 ? 'collection' : 'collections'}.`,
)
