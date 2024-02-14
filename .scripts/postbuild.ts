import glob from 'fast-glob'

await rewriteHonoJsx()

async function rewriteHonoJsx() {
  const files = await glob('./src/_lib/**/*.js')
  for (const file of files) {
    const content = await Bun.file(file).text()
    await Bun.write(
      file,
      content
        .replaceAll('hono/jsx/jsx-runtime', 'farc/jsx/jsx-runtime')
        .replaceAll('hono/jsx/jsx-dev-runtime', 'farc/jsx/jsx-dev-runtime'),
    )
  }
}
