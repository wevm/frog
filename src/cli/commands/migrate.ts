import { Cli, z } from 'incur'
import * as Store from '../../Store.js'

export const migrate = Cli.create('migrate', {
  description: 'Prepare the selected store.',
  output: z.object({ migrated: z.boolean(), store: z.string() }),
  async run() {
    return { migrated: await Store.migrate(), store: Store.activeName() }
  },
})
