import { serveStatic } from '@hono/node-server/serve-static'
import { Button, Frog, TextInput } from 'frog'
import { devtools } from 'frog/dev'
import { neynar } from 'frog/hubs'
import { Box, Heading, vars } from './ui.js'

import { app as castActionApp } from './castAction.js'
import { app as composerActionApp } from './composerAction.js'
import { app as fontsApp } from './fonts.js'
import { app as frameV2App } from './frameV2.js'
import { app as initial } from './initial.js'
import { app as middlewareApp } from './middleware.js'
import { app as neynarApp } from './neynar.js'
import { app as routingApp } from './routing.js'
import { app as signatureApp } from './signature.js'
import { app as todoApp } from './todos.js'
import { app as transactionApp } from './transaction.js'
import { app as uiSystemApp } from './ui-system.js'

export const app = new Frog({
  hub: neynar({ apiKey: 'NEYNAR_FROG_FM' }),
  ui: { vars },
  verify: 'silent',
  title: 'Playground',
})
  .frame('/', (c) => {
    const { buttonValue, inputText, status } = c
    const fruit = inputText || buttonValue
    return c.res({
      action: '/action',
      image: (
        <Box
          grow
          background={
            status === 'response'
              ? { custom: 'linear-gradient(to right, #432889, #17101F)' }
              : 'background'
          }
          alignHorizontal="center"
          alignVertical="center"
        >
          <Heading style="italic">
            {status === 'response'
              ? `Nice choice.${fruit ? ` ${fruit.toUpperCase()}!!` : ''}`
              : 'Welcome 🐸'}
          </Heading>
        </Box>
      ),
      intents: [
        <TextInput placeholder="Enter custom fruit" />,
        <Button value="apples">Apples</Button>,
        <Button value="oranges">Oranges</Button>,
        <Button value="bananas">Bananas</Button>,
        status === 'response' && <Button.Reset>Reset</Button.Reset>,
      ],
    })
  })
  .frame('/action', (c) => {
    const { buttonValue, inputText } = c
    const fruit = inputText || buttonValue || ''
    return c.res({
      action: '/',
      image: (
        <Box
          grow
          background="blue100"
          alignHorizontal="center"
          alignVertical="center"
        >
          <Heading>Yuck! {fruit}! Enter another one.</Heading>
        </Box>
      ),
      intents: [
        <Button value="watermelon">Watermelon</Button>,
        <Button value="mango">Mango</Button>,
        <Button value="pear">Pear</Button>,
        <Button.Reset>Reset</Button.Reset>,
      ],
    })
  })
  .frame('/buttons', (c) => {
    return c.res({
      image: <Box grow backgroundColor="red" />,
      intents: [
        <Button.Redirect location="http://github.com/honojs/vite-plugins/tree/main/packages/dev-server">
          Redirect
        </Button.Redirect>,
        <Button.Link href="https://www.example.com">Link</Button.Link>,
        <Button.Mint target="eip155:7777777:0x060f3edd18c47f59bd23d063bbeb9aa4a8fec6df">
          Mint
        </Button.Mint>,
        <Button.Reset>Reset</Button.Reset>,
      ],
    })
  })
  .frame('/no-intents', (c) => {
    return c.res({
      image: <Box grow backgroundColor="red" />,
      imageAspectRatio: '1:1',
    })
  })
  .frame('/falsy-intents', (c) => {
    return c.res({
      image: <Box grow backgroundColor="red" />,
      intents: [
        null,
        undefined,
        false,
        <Button>Apples</Button>,
        false && <Button>Oranges</Button>,
      ],
    })
  })
  .frame('/mint', (c) => {
    return c.res({
      image: 'https://basepaint.xyz/api/art/image?day=191',
      imageAspectRatio: '1:1',
      intents: [
        <Button.Mint target="eip155:7777777:0xba5e05cb26b78eda3a2f8e3b3814726305dcac83:191">
          Mint
        </Button.Mint>,
      ],
    })
  })
  .frame('/button-action', (c) => {
    const { buttonValue } = c
    return c.res({
      image: (
        <Box grow backgroundColor="red">
          {buttonValue ?? 'foo'}
        </Box>
      ),
      intents: [
        <Button action="/" value="hello again">
          Fruits
        </Button>,
        <Button action="/button-action-2" value="next">
          Next
        </Button>,
        <Button action="/image-only" value="cheese">
          Image only
        </Button>,
      ],
    })
  })
  .frame('/button-action-2', (c) => {
    const { buttonValue } = c
    return c.res({
      image: (
        <Box grow backgroundColor="red">
          {buttonValue ?? 'foo'}
        </Box>
      ),
      intents: [
        <Button action="/button-action" value="back">
          Back
        </Button>,
      ],
    })
  })
  .frame('/image-only', (c) => {
    return c.res({
      image: (
        <Box grow backgroundColor="red">
          foo
        </Box>
      ),
    })
  })
  .frame('/redirect-buttons', (c) => {
    return c.res({
      image: <div tw="flex">foo</div>,
      intents: [
        <Button.Redirect location={`https://example.com/${c.frameData?.fid}`}>
          FID
        </Button.Redirect>,
        <Button.Redirect
          location={`https://example.com/${c.frameData?.castId?.fid}`}
        >
          Cast ID
        </Button.Redirect>,
        <Button.Reset>Reset</Button.Reset>,
      ],
    })
  })
  // Error on purpose
  .frame('/error', (c) => {
    return c.res({
      action: '/error/end',
      image: <div tw="flex">Invoke error</div>,
      intents: [<Button>Invoke</Button>],
    })
  })
  .frame('/error/end', (c) => {
    return c.error({ message: 'Bad inputs!' })
  })
  .route('/castAction', castActionApp)
  .route('/composerAction', composerActionApp)
  .route('/initial', initial)
  .route('/ui', uiSystemApp)
  .route('/fonts', fontsApp)
  .route('/middleware', middlewareApp)
  .route('/neynar', neynarApp)
  .route('/routing', routingApp)
  .route('/transaction', transactionApp)
  .route('/todos', todoApp)
  .route('/signature', signatureApp)
  .route('/frame-v2', frameV2App)
  .frame('/:dynamic', (c) => {
    const dynamic = c.req.param('dynamic')
    return c.res({
      image: (
        <div
          style={{
            display: 'flex',
            backgroundColor: 'black',
            color: 'white',
            fontSize: 60,
            width: '100%',
            height: '100%',
          }}
        >
          dynamic route {dynamic} should still work with devtools
        </div>
      ),
      intents: [<Button>rerender</Button>],
    })
  })

devtools(app, { serveStatic })
