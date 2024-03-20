import colors from 'picocolors'
// Forked from https://github.com/vitejs/vite/blob/1a3b1d73d7babdab6a52a5fb1ef193fd63666877/packages/vite/src/node/logger.ts#L161
import type { Logger, ResolvedServerUrls } from 'vite'

export type ServerUrls = ResolvedServerUrls & { dev: string[] }

export function printServerUrls(
  urls: ServerUrls,
  options: {
    dev: string | boolean | undefined
    host: string | boolean | undefined
  },
  info: Logger['info'],
): void {
  const colorUrl = (url: string) =>
    colors.cyan(url.replace(/:(\d+)\//, (_, port) => `:${colors.bold(port)}/`))

  for (const url of urls.local) {
    info(`  ${colors.green('➜')}  ${colors.bold('Local')}:   ${colorUrl(url)}`)
  }
  for (const url of urls.network) {
    info(`  ${colors.green('➜')}  ${colors.bold('Network')}: ${colorUrl(url)}`)
  }
  for (const url of urls.dev) {
    info(`  ${colors.green('➜')}  ${colors.bold('Inspect')}: ${colorUrl(url)}`)
  }

  if (urls.dev.length === 0 && options.dev === undefined)
    info(
      colors.dim(`  ${colors.green('➜')}  ${colors.bold('Inspect')}: add `) +
        colors.bold('devtools') +
        colors.dim(' to app'),
    )

  if (urls.network.length === 0 && options.host === undefined)
    info(
      colors.dim(`  ${colors.green('➜')}  ${colors.bold('Network')}: use `) +
        colors.bold('--host') +
        colors.dim(' to expose'),
    )
}
