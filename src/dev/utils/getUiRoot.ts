import { isCloudflareWorkers } from './env.js'

export async function getUiRoot(): Promise<string | undefined> {
  if (!isCloudflareWorkers()) {
    const { dirname, relative, resolve } = await import('node:path')
    const { fileURLToPath } = await import('node:url')
    return relative(
      './',
      resolve(dirname(fileURLToPath(import.meta.url)), '../../ui'),
    )
  }

  return
}
