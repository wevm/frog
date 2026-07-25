import fs from 'node:fs/promises'
import path from 'node:path'
import { Cli, z } from 'incur'
import * as Manifest from '../../Manifest.js'
import * as context from '../internal/context.js'

export const manifest = Cli.create('manifest', {
  description: 'Print the well-known document that makes this project a friction target.',
  options: z.object({
    cwd: context.cwdOption,
    package: z
      .array(z.string().min(1))
      .optional()
      .describe('npm package this document speaks for. Repeatable. Defaults to this package.'),
  }),
  examples: [
    { description: 'Print the document' },
    { description: 'Speak for several packages', options: { package: ['viem', 'ox'] } },
  ],
  hint: `Serve it at /${Manifest.wellKnown}: frictionsets manifest --json > public/${Manifest.wellKnown}`,
  output: z.object({
    docs: z.string().optional(),
    inbound: z.boolean(),
    labels: z.array(z.string()).optional(),
    name: z.string().optional(),
    packages: z.array(z.string()).optional(),
    repo: z.string(),
    version: z.literal(Manifest.version),
  }),
  async run(c) {
    const { config, repo, root } = await context.resolve({ cwd: c.options.cwd })

    if (!repo)
      return c.error({
        code: 'NO_REPO',
        message: 'Could not determine which repository issues would be filed on.',
        cta: {
          commands: [{ command: 'init', description: 'Then set `repo` in the config file' }],
          description: 'Add a GitHub `origin` remote, or:',
        },
      })

    const own = await fs
      .readFile(path.join(root, 'package.json'), 'utf8')
      .then((contents) => JSON.parse(contents) as { name?: string })
      .catch(() => undefined)

    const packages = c.options.package ?? (own?.name ? [own.name] : [])

    return c.ok(
      Manifest.render({
        repo,
        ...(config.inbound.labels ? { labels: config.inbound.labels } : {}),
        ...(own?.name ? { name: own.name } : {}),
        ...(packages.length ? { packages } : {}),
        ...(config.site ? { docs: config.site } : {}),
      }),
      {
        cta: {
          commands: [{ command: 'targets', description: 'See which dependencies accept reports' }],
          description: 'Next:',
        },
      },
    )
  },
})
