import { Frog } from 'frog'

import { vars } from './ui.js'

export const app = new Frog({
  ui: { vars },
  title: 'Composer Action',
}).composerAction('/', async (c) => {
  console.log(
    `Composer Action call ${JSON.stringify(c.actionData, null, 2)} from ${
      c.actionData.fid
    }`,
  )
  if (Math.random() > 0.5) return c.error({ message: 'Action failed :(' })
  return c.res({
    title: 'Some Composer Action',
    url: 'https://somewhere.com/some-form',
  })
})
