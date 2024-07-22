import { Frog } from 'frog'

import { vars } from './ui.js'

export const app = new Frog({
  ui: { vars },
  title: 'Composer Action',
}).composerAction(
  '/',
  async (c) => {
    if (Math.random() > 0.5) return c.error({ message: 'Action failed :(' })
    return c.res({
      title: 'Some Composer Action',
      url: 'https://example.com',
    })
  },
  {
    name: 'Some Composer Action',
    description: 'Cool Composer Action',
    icon: 'image',
    imageUrl: 'https://frog.fm/logo-light.svg',
  },
)
