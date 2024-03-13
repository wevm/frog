import { resolve, extname } from 'node:path'
import glob from 'fast-glob'
import { copy, rename, remove } from 'fs-extra'

await inlineDevtoolsStaticFiles()
await rewriteHonoJsx()
await prepareTemplates()

async function inlineDevtoolsStaticFiles() {
  const assetPaths = [
    ...(await glob('./src/dev/ui/assets/*')),
    './src/dev/ui/index.js',
  ]
  const content: string[] = []
  for (const asset of assetPaths) {
    const file = await Bun.file(asset).text()
    const escaped = file.trim().replace(/"/g, '\\"')

    const extension = extname(asset)
    if (extension === '.css')
      content.push(`_jsx("style", { children: "${escaped}" })`)
    else if (extension === '.js')
      content.push(
        `_jsx("script", { children: html("${escaped}"), type: "module" })`,
      )
    else throw new Error(`Unknown asset type: ${extension}`)
  }

  const entryPath = './src/_lib/dev/client_.js'
  let entry = await Bun.file(entryPath).text()
  entry = entry.replace('_jsx(_Fragment, {})', content.join(', '))

  await Bun.write('./src/_lib/dev/client_.js', entry)

  const renameClientPaths = await glob('./src/_lib/dev/client_.*')
  for (const path of renameClientPaths)
    await rename(path, path.replace('client_', 'client'))

  await remove('./src/dev/ui')
}

async function rewriteHonoJsx() {
  const files = await glob('./src/_lib/**/*.js')
  for (const file of files) {
    const content = await Bun.file(file).text()
    await Bun.write(
      file,
      content
        .replaceAll('hono/jsx/jsx-runtime', 'frog/jsx/jsx-runtime')
        .replaceAll('hono/jsx/jsx-dev-runtime', 'frog/jsx/jsx-dev-runtime'),
    )
  }
}

async function prepareTemplates() {
  await copy(
    resolve(import.meta.dirname, '../templates'),
    resolve(import.meta.dirname, '../create-frog/templates'),
    {
      filter: (src) => !src.includes('node_modules'),
    },
  )

  const dotfiles = await glob(
    resolve(import.meta.dirname, '../create-frog/**/.*'),
  )
  for (const dotfile of dotfiles)
    await rename(dotfile, dotfile.replace('/.', '/_'))
}
