import { Cli, z } from 'incur'
import * as Store from '../../Store.js'
import * as context from '../internal/context.js'

export const resolve = Cli.create('resolve', {
  description: 'Remove one resolved friction entry.',
  args: z.object({ id: z.string().min(1).describe('Exact entry id from `frog list`.') }),
  options: z.object({ cwd: context.cwdOption }),
  examples: [{ args: { id: '20260803000000-example' }, description: 'Mark one entry resolved' }],
  output: z.object({ id: z.string(), removed: z.boolean() }),
  async run(c) {
    const { root } = await context.resolve({ cwd: c.options.cwd })
    return { id: c.args.id, removed: await Store.remove(c.args.id, { root }) }
  },
})
