import { Cli, z } from 'incur'
import { attempt } from '../internal/attempt.js'
import * as cache from '../internal/cache.js'
import * as context from '../internal/context.js'
import * as octokit from '../internal/octokit.js'
import * as target from '../internal/target.js'

export const targets = Cli.create('targets', {
  description: 'List dependencies that accept friction reports.',
  env: z.object({
    GH_TOKEN: z.string().optional().describe('Fallback when GITHUB_TOKEN is unset.'),
    GITHUB_API_URL: z
      .string()
      .optional()
      .describe('API base URL. Set automatically inside Actions.'),
    XDG_CACHE_HOME: z.string().optional().describe('Where consent lookups are cached.'),
    GITHUB_TOKEN: z.string().optional().describe('Token used to read each dependency config.'),
  }),
  options: z.object({
    cwd: context.cwdOption,
    token: z.string().min(1).optional().describe('GitHub token. Overrides the environment.'),
  }),
  examples: [{ description: 'Which dependencies accept reports' }],
  hint: 'Report to one of these with `frog log --target <name>`.',
  output: z.object({
    targets: z.array(
      z.object({
        name: z.string().describe('Package name.'),
        repo: z.string().describe('Repository issues are filed on.'),
      }),
    ),
  }),
  async run(c) {
    const { repo, root } = await context.resolve({ cwd: c.options.cwd })

    // Consent lives on the target repository, so this needs a client. Works unauthenticated at 60
    // requests an hour. The day-long cache keeps runs within that limit.
    const token = await octokit.token({
      env: c.env,
      ...(c.options.token ? { token: c.options.token } : {}),
    })
    const client = octokit.client({
      ...(token ? { token } : {}),
      ...(c.env.GITHUB_API_URL ? { baseUrl: c.env.GITHUB_API_URL } : {}),
    })

    const found = await attempt(
      target.accepting({ client, root, self: repo, store: cache.file(cache.dir(c.env)) }),
    )
    if (!found.ok) return c.error({ code: found.code, message: found.message })

    return c.ok(
      { targets: [...found.value] },
      {
        cta: {
          commands: [{ command: 'log', description: 'Report friction with --target' }],
          description: 'Next:',
        },
      },
    )
  },
})
