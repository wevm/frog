import { Cli, z } from 'incur'
import { attempt } from '../internal/attempt.js'
import * as context from '../internal/context.js'
import * as target from '../internal/target.js'

export const targets = Cli.create('targets', {
  description: 'List dependencies that accept friction reports.',
  options: z.object({
    cwd: context.cwdOption,
    probe: z
      .boolean()
      .optional()
      .describe("Also fetch well-known documents from each dependency's homepage. Costs network."),
  }),
  examples: [
    { description: 'Which dependencies accept reports' },
    { description: 'Include projects that only advertise on a site', options: { probe: true } },
  ],
  hint: 'Report to one of these with `frog log --target <name>`.',
  output: z.object({
    targets: z.array(
      z.object({
        kind: z.enum(['npm', 'well-known']).describe('How the declaration was found.'),
        name: z.string().describe('Package name, or host.'),
        repo: z.string().describe('Repository issues are filed on.'),
      }),
    ),
  }),
  async run(c) {
    const { root } = await context.resolve({ cwd: c.options.cwd })

    const found = await attempt(
      target.accepting({ root, ...(c.options.probe ? { probe: true } : {}) }),
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
