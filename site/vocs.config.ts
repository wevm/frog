import { defineConfig } from 'vocs'
import { version } from '../src/package.json'

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
  rootDir: '.',
  socials: [
    {
      icon: 'discord',
      link: 'https://discord.gg/JUrRkGweXV',
    },
    {
      icon: 'github',
      link: 'https://github.com/wevm/frog',
    },
    {
      icon: 'x',
      link: 'https://twitter.com/wevm_dev',
    },
  ],
  sponsors: [
    {
      name: 'Collaborator',
      height: 120,
      items: [
        [
          {
            name: 'Paradigm',
            link: 'https://paradigm.xyz',
            image:
              'https://raw.githubusercontent.com/wevm/.github/main/content/sponsors/paradigm-light.svg',
          },
        ],
      ],
    },
    {
      name: 'Large Enterprise',
      height: 60,
      items: [
        [
          {
            name: 'WalletConnect',
            link: 'https://walletconnect.com',
            image:
              'https://raw.githubusercontent.com/wevm/.github/main/content/sponsors/walletconnect-light.svg',
          },
          {
            name: 'Stripe',
            link: 'https://www.stripe.com',
            image:
              'https://raw.githubusercontent.com/wevm/.github/main/content/sponsors/stripe-light.svg',
          },
        ],
      ],
    },
    {
      name: 'Small Enterprise',
      height: 40,
      items: [
        [
          {
            name: 'Family',
            link: 'https://twitter.com/family',
            image:
              'https://raw.githubusercontent.com/wevm/.github/main/content/sponsors/family-light.svg',
          },
          {
            name: 'Context',
            link: 'https://twitter.com/context',
            image:
              'https://raw.githubusercontent.com/wevm/.github/main/content/sponsors/context-light.svg',
          },
          {
            name: 'PartyDAO',
            link: 'https://twitter.com/prtyDAO',
            image:
              'https://raw.githubusercontent.com/wevm/.github/main/content/sponsors/partydao-light.svg',
          },
        ],
        [
          {
            name: 'SushiSwap',
            link: 'https://www.sushi.com',
            image:
              'https://raw.githubusercontent.com/wevm/.github/main/content/sponsors/sushi-light.svg',
          },
          {
            name: 'Dynamic',
            link: 'https://www.dynamic.xyz',
            image:
              'https://raw.githubusercontent.com/wevm/.github/main/content/sponsors/dynamic-light.svg',
          },
          {
            name: 'BitKeep',
            link: 'https://bitkeep.com',
            image:
              'https://raw.githubusercontent.com/wevm/.github/main/content/sponsors/bitkeep-light.svg',
          },
        ],
        [
          {
            name: 'Privy',
            link: 'https://privy.io',
            image:
              'https://raw.githubusercontent.com/wevm/.github/main/content/sponsors/privy-light.svg',
          },
          {
            name: 'Spruce',
            link: 'https://spruceid.com',
            image:
              'https://raw.githubusercontent.com/wevm/.github/main/content/sponsors/spruce-light.svg',
          },
          {
            name: 'rollup.id',
            link: 'https://rollup.id',
            image:
              'https://raw.githubusercontent.com/wevm/.github/main/content/sponsors/rollup.id-light.svg',
          },
        ],
        [
          {
            name: 'PancakeSwap',
            link: 'https://pancakeswap.finance',
            image:
              'https://raw.githubusercontent.com/wevm/.github/main/content/sponsors/pancake-light.svg',
          },
          {
            name: 'Celo',
            link: 'https://celo.org',
            image:
              'https://raw.githubusercontent.com/wevm/.github/main/content/sponsors/celo-light.svg',
          },
          {
            name: 'Rainbow',
            link: 'https://rainbow.me',
            image:
              'https://raw.githubusercontent.com/wevm/.github/main/content/sponsors/rainbow-light.svg',
          },
        ],
        [
          {
            name: 'Pimlico',
            link: 'https://pimlico.io',
            image:
              'https://raw.githubusercontent.com/wevm/.github/main/content/sponsors/pimlico-light.svg',
          },
          {
            name: 'Zora',
            link: 'https://zora.co',
            image:
              'https://raw.githubusercontent.com/wevm/.github/main/content/sponsors/zora-light.svg',
          },
          {
            name: 'Supa',
            link: 'https://twitter.com/supafinance',
            image:
              'https://raw.githubusercontent.com/wevm/.github/main/content/sponsors/supa-light.svg',
          },
        ],
      ],
    },
  ],
  sidebar: [
    {
      text: 'Getting Started',
      link: '/getting-started',
    },
    {
      text: 'Concepts',
      items: [
        {
          text: 'Overview',
          link: '/concepts/overview',
        },
        {
          text: 'Routing',
          link: '/concepts/routing',
        },
        {
          text: 'Connecting Frames (Actions)',
          link: '/concepts/actions',
        },
        {
          text: 'Images & Intents',
          link: '/concepts/images-intents',
        },
        {
          text: 'Browser Redirects',
          link: '/concepts/browser-redirects',
        },
        {
          text: 'State Management',
          link: '/concepts/state-management',
        },
        {
          text: 'Frame Verification',
          link: '/concepts/frame-verification',
        },
        {
          text: 'Devtools 🚧',
        },
      ],
    },
    {
      text: 'Platforms',
      items: [
        {
          text: 'Bun',
          link: '/platforms/bun',
        },
        {
          text: 'Cloudflare Workers',
          link: '/platforms/cloudflare-workers',
        },
        {
          text: 'Next.js 🚧',
        },
        {
          text: 'Node.js 🚧',
        },
        {
          text: 'Vercel 🚧',
        },
      ],
    },
    {
      text: 'Intent Reference',
      items: [
        { text: 'Button', link: '/intents/button' },
        { text: 'Button.Link', link: '/intents/button-link' },
        { text: 'Button.Mint', link: '/intents/button-mint' },
        { text: 'Button.Redirect', link: '/intents/button-redirect' },
        { text: 'Button.Reset', link: '/intents/button-reset' },
        { text: 'TextInput', link: '/intents/textinput' },
      ],
    },
    {
      text: 'Frog Reference',
      items: [
        { text: 'Frog', link: '/reference/frog' },
        { text: 'Frog.frame', link: '/reference/frog-frame' },
        { text: 'Frog.frame Context', link: '/reference/frog-frame-context' },
        {
          text: 'Frog.frame Return Value',
          link: '/reference/frog-frame-return-value',
        },
        { text: 'Frog.hono', link: '/reference/frog-hono' },
      ],
    },
  ],
  title: 'Frog',
  topNav: [
    {
      text: version,
      items: [
        {
          text: 'Changelog',
          link: 'https://github.com/wevm/frog/blob/main/src/CHANGELOG.md',
        },
        {
          text: 'Contributing',
          link: 'https://github.com/wevm/frog/blob/main/.github/CONTRIBUTING.md',
        },
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
