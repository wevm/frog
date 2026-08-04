import { Cli, z } from 'incur'
import * as Store from '../../Store.js'
import * as environmentStore from '../internal/store.js'

export const migrate = Cli.create('migrate', {
  vars: environmentStore.vars,
  description: 'Prepare the selected store.',
  output: z.object({ migrated: z.boolean(), store: z.string() }),
  async run(c) {
    const store = c.var.store ?? Store.file({ root: process.cwd() })
    await store.migrate()
    return { migrated: store.name !== 'file', store: store.name }
  },
})
