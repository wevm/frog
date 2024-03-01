import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { intro, log, outro, select, text } from '@clack/prompts'
import { default as fs } from 'fs-extra'
import { default as ignore } from 'ignore'
import { default as pc } from 'picocolors'
import { getTemplates } from './utils/getTemplates.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export type CreateParameters = { name: string; template: string }

function templateNameToDefaultPort(name: string): number {
  switch (name) {
    case 'next':
      return 3000
    case 'bun':
    case 'node':
    case 'cloudflare-worker':
    case 'default':
    case 'vercel':
      return 5173
    default:
      throw new Error('Unknown template name')
  }
}

function templateNameToDefaultFrogPath(name: string): string {
  switch (name) {
    case 'next':
      return '/api'
    case 'bun':
    case 'node':
    case 'cloudflare-worker':
    case 'default':
    case 'vercel':
      return '/dev'
    default:
      throw new Error('Unknown template name')
  }
}

export async function create(params: CreateParameters) {
  intro('Welcome to Frog! 🐸')

  const displayName =
    params.name ||
    ((await text({
      message: 'Enter the name of your project',
      placeholder: 'my-first-frog',
      validate(value) {
        if (!value) return 'Please enter a name.'
        return
      },
    })) as string)
  const name = kebabcase(displayName)

  const destDir = resolve(process.cwd(), name)

  const templates = getTemplates()

  const templateName =
    params.template ||
    ((await select({
      message: 'Choose a template',
      options: templates.map((template) => ({
        name: template,
        value: template,
      })),
      initialValue: 'default',
    })) as string)

  const templateDir = resolve(__dirname, `../templates/${templateName}`)

  const gitignore = fs
    .readFileSync(resolve(templateDir, '_gitignore'))
    .toString()

  // @ts-ignore
  const ig = ignore().add(gitignore)

  // Copy contents
  fs.copySync(templateDir, destDir, {
    filter(src) {
      const path = relative(templateDir, src)
      return !path || !ig.ignores(path)
    },
  })

  // Replace dotfiles
  for (const file of fs.readdirSync(destDir)) {
    if (!file.startsWith('_')) continue
    fs.renameSync(resolve(destDir, file), resolve(destDir, `.${file.slice(1)}`))
  }

  // Replace package.json properties
  const pkgJson = fs.readJsonSync(resolve(destDir, 'package.json'))
  pkgJson.name = name
  fs.writeJsonSync(resolve(destDir, 'package.json'), pkgJson, { spaces: 2 })

  // Wrap up
  log.success(`Project successfully scaffolded in ${pc.blue(destDir)}!`)

  const pkgManager = detectPackageManager()

  log.message('Next steps:')
  log.step(`1. ${pc.blue(`cd ./${name}`)} - Navigate to project`)
  log.step(
    `2. ${pc.blue(
      pkgManagerInstallCommand(pkgManager),
    )} - Install dependencies`,
  )
  log.step(
    `3. ${pc.blue(pkgManagerRunCommand(pkgManager, 'dev'))} - Start dev server`,
  )
  log.step(
    `4. Head to ${pc.blue(
      `http://localhost:${templateNameToDefaultPort(
        templateName,
      )}${templateNameToDefaultFrogPath(templateName)}`,
    )}`,
  )

  outro('Done! 🤠')
}

type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun'

function detectPackageManager(): PackageManager {
  const userAgent = process.env.npm_config_user_agent
  if (!userAgent) return 'npm'
  if (userAgent.includes('bun')) return 'bun'
  if (userAgent.includes('yarn')) return 'yarn'
  if (userAgent.includes('pnpm')) return 'pnpm'
  if (userAgent.includes('npm')) return 'npm'
  return 'npm'
}

function pkgManagerInstallCommand(pkgManager: PackageManager) {
  if (pkgManager === 'bun') return 'bun install'
  if (pkgManager === 'yarn') return 'yarn'
  if (pkgManager === 'pnpm') return 'pnpm install'
  return 'npm install'
}

function pkgManagerRunCommand(pkgManager: PackageManager, command: string) {
  if (pkgManager === 'bun') return `bun run ${command}`
  if (pkgManager === 'yarn') return `yarn ${command}`
  if (pkgManager === 'pnpm') return `pnpm ${command}`
  return `npm run ${command}`
}

function kebabcase(str: string) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
}
