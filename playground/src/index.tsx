import { Button, Frog, TextInput } from 'frog'

import { app as routingApp } from './routing.js'
import { app as todoApp } from './todos.js'

export const app = new Frog({
  browserLocation: '/:path/dev',
  verify: 'silent',
})

app.frame('/', (context) => {
  const { buttonValue, inputText, status } = context
  const fruit = inputText || buttonValue
  return {
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
            : 'Welcome!'}
        </div>
      </div>
    ),
    intents: [
      <TextInput placeholder="Enter custom fruit..." />,
      <Button value="apples">Apples</Button>,
      <Button value="oranges">Oranges</Button>,
      <Button value="bananas">Bananas</Button>,
      status === 'response' && <Button.Reset>Reset</Button.Reset>,
    ],
  }
})

app.frame('/action', ({ buttonValue, inputText }) => {
  const fruit = inputText || buttonValue || ''
  return {
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
  }
})

app.frame('/buttons', ({ buttonValue }) => {
  return {
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
      <Button.Redirect location="https://github.com/honojs/vite-plugins/tree/main/packages/dev-server">
        Redirect
      </Button.Redirect>,
      <Button.Link href="https://www.example.com">Link</Button.Link>,
      <Button.Mint target="eip155:7777777:0x060f3edd18c47f59bd23d063bbeb9aa4a8fec6df">
        Mint
      </Button.Mint>,
      <Button.Reset>Reset</Button.Reset>,
    ],
  }
})

app.frame('/no-intents', () => {
  return {
    image: (
      <div style={{ backgroundColor: 'green', width: '100%', height: '100%' }}>
        foo
      </div>
    ),
    imageAspectRatio: '1:1',
  }
})

app.frame('/falsy-intents', () => {
  return {
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
  }
})

app.route('/todos', todoApp)
app.route('/routing', routingApp)
