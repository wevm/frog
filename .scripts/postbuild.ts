import { dirname, relative, resolve } from 'node:path'
import glob from 'fast-glob'
import { copy } from 'fs-extra'

await rewriteHonoJsx()
copyTemplates()

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

function copyTemplates() {
  copy(
    resolve(import.meta.dirname, '../templates'),
    resolve(import.meta.dirname, '../create-farc/templates'),
  )
}
