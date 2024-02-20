import { dirname, relative, resolve } from 'node:path'
import glob from 'fast-glob'
import { copy, rename } from 'fs-extra'

await rewriteHonoJsx()
await prepareTemplates()

async function rewriteHonoJsx() {
  const files = await glob('./src/_lib/**/*.js')
  for (const file of files) {
    const content = await Bun.file(file).text()
    const jsxDir = relative(
      dirname(file),
      resolve(import.meta.dirname, '../src/_lib/jsx'),
    )
    await Bun.write(
      file,
      content
        .replaceAll(
          'hono/jsx/jsx-runtime',
          `${jsxDir.startsWith('.') ? jsxDir : `./${jsxDir}`}/jsx-runtime`,
        )
        .replaceAll(
          'hono/jsx/jsx-dev-runtime',
          `${jsxDir.startsWith('.') ? jsxDir : `./${jsxDir}`}/jsx-dev-runtime`,
        ),
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
