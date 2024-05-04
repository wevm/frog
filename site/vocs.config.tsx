import { defineConfig } from 'vocs'
import { version } from '../src/package.json'
import { getFrameMetadata } from '../src/utils/getFrameMetadata.js'

export default defineConfig({
  banner:
    '👣 Introducing [Multi-step Cast Actions](/concepts/multi-step-cast-actions).',
  description: 'Framework for Farcaster Frames',
  iconUrl: '/icon.png',
  async head({ path }) {
    const analytics = (
      <script
        src="https://cdn.usefathom.com/script.js"
        data-site="MYUAWCWK"
        defer
      />
    )

    if (path === '/') {
      const metadata = await getFrameMetadata('https://frame.frog.fm/api')
      return (
        <>
          {metadata.map(({ property, content }) => (
            <meta key={property} property={property} content={content} />
          ))}
          {analytics}
        </>
      )
    }

    return <>{analytics}</>
  },
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
      icon: 'warpcast',
      link: 'https://warpcast.com/wevm',
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
  sidebar: {
    '/': [
      {
        text: 'Installation',
        link: '/installation',
      },
      {
        text: 'Getting Started',
        link: '/getting-started',
      },
      {
        text: 'FrogUI',
        link: '/ui',
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
            text: 'Images & Intents',
            link: '/concepts/images-intents',
          },
          {
            text: 'Connecting Frames (Actions)',
            link: '/concepts/actions',
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
            text: 'Devtools',
            link: '/concepts/devtools',
          },
          {
            text: 'Middleware',
            link: '/concepts/middleware',
          },
          {
            text: 'Transactions',
            link: '/concepts/transactions',
          },
          {
            text: 'Cast Actions',
            link: '/concepts/cast-actions',
          },
          {
            text: 'Multi-step Cast Actions',
            link: '/concepts/multi-step-cast-actions',
          },
          {
            text: 'Error Handling',
            link: '/concepts/error-handling',
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
        text: 'Hubs',
        items: [
          {
            text: 'Neynar',
            link: '/hubs/neynar',
          },
          {
            text: 'Pinata',
            link: '/hubs/pinata',
          },
        ],
      },
      {
        text: 'Protocols',
        items: [
          {
            text: 'XMTP',
            link: '/protocols/xmtp',
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
          { text: 'Button.Transaction', link: '/intents/button-transaction' },
          { text: 'TextInput', link: '/intents/textinput' },
        ],
      },
      {
        text: 'Frog Reference',
        items: [
          { text: 'Frog', link: '/reference/frog' },
          {
            text: 'Frog.castAction',
            link: '/reference/frog-cast-action',
            items: [
              { text: 'Context', link: '/reference/frog-cast-action-context' },
              {
                text: 'Response',
                link: '/reference/frog-cast-action-response',
              },
            ],
          },
          {
            text: 'Frog.frame',
            link: '/reference/frog-frame',
            items: [
              { text: 'Context', link: '/reference/frog-frame-context' },
              {
                text: 'Response',
                link: '/reference/frog-frame-response',
              },
            ],
          },
          {
            text: 'Frog.transaction',
            link: '/reference/frog-transaction',
            items: [
              { text: 'Context', link: '/reference/frog-transaction-context' },
              {
                text: 'Response',
                link: '/reference/frog-transaction-response',
              },
            ],
          },
          { text: 'Frog.hono', link: '/reference/frog-hono' },
        ],
      },
      {
        text: 'Dev Reference',
        items: [{ text: 'devtools', link: '/dev/devtools' }],
      },
      {
        text: 'CLI Reference',
        items: [
          {
            text: 'dev',
            link: '/commands/dev',
          },
          {
            text: 'vercel-build',
            link: '/commands/vercel-build',
          },
        ],
      },
    ],
    '/ui': {
      backLink: true,
      items: [
        {
          text: 'FrogUI',
          items: [
            {
              text: 'Introduction',
              link: '/ui',
            },
            {
              text: 'Getting Started',
              link: '/ui/getting-started',
            },
          ],
        },
        {
          text: 'Concepts',
          items: [
            {
              text: 'UI System & Variables',
              link: '/ui/ui-system',
            },
            {
              text: 'Primitive Components',
              link: '/ui/primitive-components',
            },
          ],
        },
        {
          text: 'Reference',
          items: [
            {
              text: 'createSystem',
              link: '/ui/createSystem',
            },
            {
              text: 'Box',
              link: '/ui/Box',
            },
            {
              text: 'Columns',
              link: '/ui/Columns',
            },
            {
              text: 'Divider',
              link: '/ui/Divider',
            },
            {
              text: 'Icon',
              link: '/ui/Icon',
            },
            {
              text: 'Image',
              link: '/ui/Image',
            },
            {
              text: 'Heading',
              link: '/ui/Heading',
            },
            {
              text: 'HStack',
              link: '/ui/HStack',
            },
            {
              text: 'Rows',
              link: '/ui/Rows',
            },
            {
              text: 'Spacer',
              link: '/ui/Spacer',
            },
            {
              text: 'Text',
              link: '/ui/Text',
            },
            {
              text: 'VStack',
              link: '/ui/VStack',
            },
          ],
        },
      ],
    },
  },
  title: 'Frog',
  topNav: [
    {
      text: 'FrogUI',
      link: '/ui',
    },
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
