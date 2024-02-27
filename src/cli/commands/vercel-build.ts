import { extname, normalize, resolve } from 'node:path'
import glob from 'fast-glob'
import { copySync, ensureDirSync, writeJsonSync } from 'fs-extra/esm'

export async function build() {
  const files = await glob('./api/**/*.{js,jsx,ts,tsx}')
  for (const file of files) {
    const fileDir = normalize(file).replace(extname(file), '')
    const dir = resolve(
      process.cwd(),
      `./.vercel/output/functions/${fileDir}.func`,
    )
    ensureDirSync(dir)
    writeJsonSync(`${dir}/package.json`, { type: 'module' })
  }

  ensureDirSync('./.vercel/output')
  ensureDirSync('./.vercel/output/static')
  copySync('./public', './.vercel/output/static')
  writeJsonSync('./.vercel/output/config.json', {
    version: 3,
    routes: [
      {
        handle: 'filesystem',
      },
      {
        src: '^/api(?:/(.*))$',
        dest: '/api',
        check: true,
      },
      {
        src: '^/api(/.*)?$',
        status: 404,
      },
      {
        handle: 'error',
      },
      {
        status: 404,
        src: '^(?!/api).*$',
        dest: '/404.html',
      },
      {
        handle: 'miss',
      },
      {
        src: '^/api/(.+)(?:\\.(?:tsx))$',
        dest: '/api/$1',
        check: true,
      },
    ],
  })
}
