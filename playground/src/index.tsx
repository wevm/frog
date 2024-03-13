import { Button, Frog, TextInput } from 'frog'
import * as hubs from 'frog/hubs'

import { app as middlewareApp } from './middleware.js'
import { app as neynarApp } from './neynar.js'
import { app as routingApp } from './routing.js'
import { app as todoApp } from './todos.js'
import { app as transactionApp } from './transaction.js'

export const app = new Frog({
  browserLocation: '/:path/dev',
  hub: hubs.frog(),
  verify: 'silent',
})
  .frame('/', (c) => {
    const { buttonValue, inputText, status } = c
    const fruit = inputText || buttonValue
    return c.res({
      action: '/action',
      image: (
        <div
          tw="flex"
          style={{
            alignItems: 'center',
            background:
              status === 'response'
                ? 'linear-gradient(to right, #432889, #17101F)'
                : 'black',
            backgroundSize: '100% 100%',
            flexDirection: 'column',
            flexWrap: 'nowrap',
            height: '100%',
            justifyContent: 'center',
            textAlign: 'center',
            width: '100%',
          }}
        >
          <div
            style={{
              color: 'white',
              fontSize: 60,
              fontStyle: 'normal',
              letterSpacing: '-0.025em',
              lineHeight: 1.4,
              marginTop: 30,
              padding: '0 120px',
              whiteSpace: 'pre-wrap',
            }}
          >
            {status === 'response'
              ? `Nice choice.${fruit ? ` ${fruit.toUpperCase()}!!` : ''}`
              : 'Welcome :)'}
          </div>
        </div>
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
        <div
          style={{
            backgroundColor: '#1E1E4C',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 60,
            width: '100%',
            height: '100%',
          }}
        >
          Yuck! {fruit}! Enter another one.
        </div>
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
    const { buttonValue } = c
    return c.res({
      image: (
        <div
          style={{
            backgroundColor: '#2D2D2D',
            display: 'flex',
            fontSize: 60,
            width: '100%',
            height: '100%',
          }}
        >
          {buttonValue ?? ''}
        </div>
      ),
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
      image: (
        <div
          style={{ backgroundColor: 'green', width: '100%', height: '100%' }}
        >
          foo
        </div>
      ),
      imageAspectRatio: '1:1',
    })
  })
  .frame('/falsy-intents', (c) => {
    return c.res({
      image: (
        <div style={{ backgroundColor: 'red', width: '100%', height: '100%' }}>
          foo
        </div>
      ),
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
        <div style={{ backgroundColor: 'red', width: '100%', height: '100%' }}>
          {buttonValue ?? 'foo'}
        </div>
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
        <div style={{ backgroundColor: 'red', width: '100%', height: '100%' }}>
          {buttonValue ?? 'foo'}
        </div>
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
        <div style={{ backgroundColor: 'red', width: '100%', height: '100%' }}>
          foo
        </div>
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
  .route('/middleware', middlewareApp)
  .route('/neynar', neynarApp)
  .route('/routing', routingApp)
  .route('/transaction', transactionApp)
  .route('/todos', todoApp)
