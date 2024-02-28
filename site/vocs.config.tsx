import { defineConfig } from 'vocs'
import { version } from '../src/package.json'

export default defineConfig({
  description: 'Framework for Farcaster Frames',
  iconUrl: '/icon.png',
  head: (
    <>
      <meta property="fc:frame" content="vNext" />
      <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
      <meta property="fc:frame:image" content="https://frame.frog.fm/og.png" />
      <meta property="fc:frame:post_url" content="https://frame.frog.fm/api" />
      <meta
        property="fc:frame:state"
        content="%7B%22initialPath%22%3A%22%2Fapi%22%2C%22previousButtonValues%22%3A%5Bnull%2C%22_l%22%2C%22_l%22%5D%2C%22previousState%22%3A%7B%22featureIndex%22%3A0%7D%7D"
      />
      <meta property="fc:frame:button:1" content="Features →" />
      <meta property="fc:frame:button:1:action" content="post" />
      <meta
        property="fc:frame:button:1:target"
        content="https://frame.frog.fm/api/features"
      />
      <meta property="fc:frame:button:2" content="Docs" />
      <meta property="fc:frame:button:2:action" content="link" />
      <meta property="fc:frame:button:2:target" content="https://frog.fm" />
      <meta property="fc:frame:button:3" content="GitHub" />
      <meta property="fc:frame:button:3:action" content="link" />
      <meta
        property="fc:frame:button:3:target"
        content="https://github.com/wevm/frog"
      />

      <script
        src="https://cdn.usefathom.com/script.js"
        data-site="MYUAWCWK"
        defer
      />
    </>
  ),
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
  ogImageUrl: {
    '/': '/og.png',
    '/docs':
      'https://vocs.dev/api/og?logo=%logo&title=%title&description=%description',
  },
  outlineFooter: (
    <div style={{ marginLeft: 16, marginTop: 16 }}>
      <a href="https://paradigm.xyz" target="_blank" rel="noreferrer noopener">
        <img
          alt="Paradigm x Wevm"
          className="vocs_Logo_logoLight"
          src="https://raw.githubusercontent.com/wevm/.github/main/content/paradigm-collab-light.svg"
          style={{ width: 200 }}
        />
        <img
          alt="Paradigm x Wevm"
          className="vocs_Logo_logoDark"
          src="https://raw.githubusercontent.com/wevm/.github/main/content/paradigm-collab-dark.svg"
          style={{ width: 200 }}
        />
      </a>
    </div>
  ),
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
        [
          {
            name: 'PancakeSwap',
            link: 'https://pancakeswap.finance/',
            image:
              'https://raw.githubusercontent.com/wevm/.github/main/content/sponsors/pancake-light.svg',
          },
          {
            name: 'zkSync',
            link: 'https://zksync.io',
            image:
              'https://raw.githubusercontent.com/wevm/.github/main/content/sponsors/zksync-light.svg',
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
          {
            name: 'Pimlico',
            link: 'https://pimlico.io',
            image:
              'https://raw.githubusercontent.com/wevm/.github/main/content/sponsors/pimlico-light.svg',
          },
        ],
        [
          {
            name: 'Zora',
            link: 'https://zora.co',
            image:
              'https://raw.githubusercontent.com/wevm/.github/main/content/sponsors/zora-light.svg',
          },
          {
            name: 'Lattice',
            link: 'https://lattice.xyz',
            image:
              'https://raw.githubusercontent.com/wevm/.github/main/content/sponsors/lattice-light.svg',
          },
        ],
        [
          {
            name: 'Supa',
            link: 'https://twitter.com/supafinance',
            image:
              'https://raw.githubusercontent.com/wevm/.github/main/content/sponsors/supa-light.svg',
          },
          {
            name: 'Blocto',
            link: 'https://blocto.io/',
            image:
              'https://raw.githubusercontent.com/wevm/.github/main/content/sponsors/blocto-light.svg',
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
          text: 'Securing Frames',
          link: '/concepts/securing-frames',
        },
        {
          text: 'Deployment',
          link: '/concepts/deployment',
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
          text: 'Next.js',
          link: '/platforms/next',
        },
        {
          text: 'Node.js',
          link: '/platforms/node',
        },
        {
          text: 'Vercel',
          link: '/platforms/vercel',
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
          text: 'Frog.frame Response',
          link: '/reference/frog-frame-response',
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
