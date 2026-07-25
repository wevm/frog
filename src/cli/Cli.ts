import { Cli } from 'incur'
import { init } from './commands/init.js'
import { list } from './commands/list.js'
import { log } from './commands/log.js'
import { publish } from './commands/publish.js'
import { sync } from './commands/sync.js'

export const cli = Cli.create('frictionsets', {
  description: 'Turn friction you hit while building into GitHub issues.',
  sync: {
    depth: 0,
    include: ['_root'],
    suggestions: [
      'log the friction I just hit',
      'show me which of my dependencies accept friction reports',
    ],
  },
})
  .command(init)
  .command(list)
  .command(log)
  .command(publish)
  .command(sync)

export default cli
