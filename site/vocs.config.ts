import { defineConfig } from 'vocs'

export default defineConfig({
  title: 'Farc',
  sidebar: [
    {
      text: 'Getting Started',
      link: '/getting-started',
    },
    {
      text: 'Concepts',
      items: [
        {
          text: 'Structure & Routing',
        },
        {
          text: 'Actions',
        },
        {
          text: 'Images & Intents',
        },
        {
          text: 'Browser Redirects',
        },
        {
          text: 'State Management',
        },
      ],
    },
    {
      text: 'Platforms',
      items: [
        {
          text: 'Bun',
        },
        {
          text: 'Cloudflare',
        },
        {
          text: 'Next.js',
        },
        {
          text: 'Node.js',
        },
        {
          text: 'Vercel',
        },
      ],
    },
    {
      text: 'Reference',
      items: [
        { text: 'Farc' },
        { text: 'Farc.frame' },
        { text: 'Farc.hono' },
        { text: 'Farc.route' },
        { text: 'Intents' },
      ],
    },
  ],
})
