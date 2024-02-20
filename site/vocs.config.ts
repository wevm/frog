import { defineConfig } from 'vocs'

export default defineConfig({
  title: 'Frog',
  rootDir: '.',
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
        { text: 'Frog' },
        { text: 'Frog.frame' },
        { text: 'Frog.hono' },
        { text: 'Frog.route' },
        { text: 'Intents' },
      ],
    },
  ],
})
