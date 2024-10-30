import { defineConfig } from 'vocs'
import { version } from '../src/package.json'
import { getFrameMetadata } from '../src/utils/getFrameMetadata.js'

export default defineConfig({
  banner:
    'Introducing [✍️ Signatures](/concepts/signatures) and [🖥️ Composer Actions](/concepts/composer-actions)',
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
            text: 'Image Handler',
            link: '/concepts/image-handler',
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
            text: 'Signatures',
            link: '/concepts/signatures',
          },
          {
            text: 'Cast Actions',
            link: '/concepts/cast-actions',
          },
          {
            text: 'Client-Side Helpers',
            link: '/concepts/client-side-helpers',
          },
          {
            text: 'Composer Actions',
            link: '/concepts/composer-actions',
          },
          {
            text: 'Multi-step Cast Actions',
            link: '/concepts/multi-step-cast-actions',
          },
          {
            text: 'Mini-Apps',
            link: '/concepts/mini-apps',
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
            text: 'Frog.composerAction',
            link: '/reference/frog-composer-action',
            items: [
              {
                text: 'Context',
                link: '/reference/frog-composer-action-context',
              },
              {
                text: 'Response',
                link: '/reference/frog-composer-action-response',
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
            text: 'Frog.image',
            link: '/reference/frog-image',
            items: [
              { text: 'Context', link: '/reference/frog-image-context' },
              {
                text: 'Response',
                link: '/reference/frog-image-response',
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
          {
            text: 'Frog.signature',
            link: '/reference/frog-signature',
            items: [
              { text: 'Context', link: '/reference/frog-signature-context' },
              {
                text: 'Response',
                link: '/reference/frog-signature-response',
              },
            ],
          },
          { text: 'Frog.hono', link: '/reference/frog-hono' },
        ],
      },
      {
        text: 'Middlewares',
        items: [
          {
            text: 'Neynar',
            link: '/middlewares/neynar',
          },
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
