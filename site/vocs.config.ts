import { defineConfig } from 'vocs'

export default defineConfig({
  description: 'Framework for Farcaster Frames',
  iconUrl: '/icon.png',
  logoUrl: {
    light: '/logo-light.svg',
    dark: '/logo-dark.svg',
  },
  markdown: {
    code: {
      themes: {
        light: 'vitesse-light',
        dark: 'poimandres',
      },
    },
  },
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
          text: 'Structure',
          link: '/concepts/structure',
        },
        {
          text: 'Routing',
        },
        {
          text: 'Context',
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
        {
          text: 'Frame Verification',
        },
        {
          text: 'Devtools',
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
  theme: {
    accentColor: {
      light: 'rgb(33, 131, 88)',
      dark: 'rgb(61, 214, 140)',
    },
  },
})
