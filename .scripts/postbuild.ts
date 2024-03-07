import { resolve, extname } from 'node:path'
import glob from 'fast-glob'
import { copy, rename } from 'fs-extra'

// await inlineDevtoolsStaticFiles()
await rewriteHonoJsx()
await prepareTemplates()

async function inlineDevtoolsStaticFiles() {
  const assetPaths = [
    ...(await glob('./src/_lib/dev/static/assets/*')),
    './src/_lib/dev/static/entry-client.js',
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

  console.log(content)

  const entryPath = './src/_lib/dev/entry-server.js'
  const entry = await Bun.file(entryPath).text()

  // const escapedJs = js.trim().replace(/"/g, '\\"')
  // const script = `_jsx("script", { children: html(\"${escapedJs}\"), type: "module", crossorigin: "" })`
  //
  // // https://regexr.com/7t4ee
  // const scriptRegex = /, _jsx\(\"script\".*?\}\)/
  // const content = `import { html } from 'hono/html'\n${entry.replace(
  //   scriptRegex,
  //   `, ${style}, ${script}`,
  // )}`
  //
  // await Bun.write('./src/_lib/dev/entry-server.js', content)
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
