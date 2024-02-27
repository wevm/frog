import { Button, Frog, TextInput } from 'frog'

import { app as routingApp } from './routing.js'
import { app as todoApp } from './todos.js'

export const app = new Frog({
  browserLocation: '/:path/dev',
  hubApiUrl: 'https://api.hub.wevm.dev',
  verify: 'silent',
})

app.frame('/', (c) => {
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

app.frame('/action', (c) => {
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

app.frame('/buttons', (c) => {
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

app.frame('/no-intents', (c) => {
  return c.res({
    image: (
      <div style={{ backgroundColor: 'green', width: '100%', height: '100%' }}>
        foo
      </div>
    ),
    imageAspectRatio: '1:1',
  })
})

app.frame('/falsy-intents', (c) => {
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

app.frame('/mint', (c) => {
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

app.frame('/button-action', (c) => {
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

app.frame('/button-action-2', (c) => {
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

app.frame('/image-only', (c) => {
  return c.res({
    image: (
      <div style={{ backgroundColor: 'red', width: '100%', height: '100%' }}>
        foo
      </div>
    ),
  })
})

app.frame('/redirect-buttons', (c) => {
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

app.frame('/transaction', () => {
  return {
    image: (
      <div style={{ backgroundColor: 'red', width: '100%', height: '100%' }}>
        Example
      </div>
    ),
    intents: [
      <Button.experimental_Transaction location="/tx?foo=bar">
        /tx
      </Button.experimental_Transaction>,
      <Button.experimental_Transaction location="/tx-contract?foo=bar">
        /tx-contract
      </Button.experimental_Transaction>,
    ],
  }
})

app.experimental_transaction('/tx', (c) => {
  return c.res({
    description: 'Rent 1 Farcaster storage unit to FID 3621',
    to: '0x00000000fcCe7f938e7aE6D3c335bD6a1a7c593D',
    data: '0x783a112b0000000000000000000000000000000000000000000000000000000000000e250000000000000000000000000000000000000000000000000000000000000001',
    value: '984316556204476',
    chainId: '10',
  })
})

app.experimental_transaction('/tx-contract', (c) => {
  return c.contract({
    abi: erc20Abi,
    functionName: 'transferFrom',
    args: ['0x', '0x', 1n],
    description: 'foo',
    to: '0x00000000fcCe7f938e7aE6D3c335bD6a1a7c593D',
    value: '984316556204476',
    chainId: '10',
  })
})

app.route('/todos', todoApp)
app.route('/routing', routingApp)

export const erc20Abi = [
  {
    type: 'event',
    name: 'Approval',
    inputs: [
      {
        indexed: true,
        name: 'owner',
        type: 'address',
      },
      {
        indexed: true,
        name: 'spender',
        type: 'address',
      },
      {
        indexed: false,
        name: 'value',
        type: 'uint256',
      },
    ],
  },
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      {
        indexed: true,
        name: 'from',
        type: 'address',
      },
      {
        indexed: true,
        name: 'to',
        type: 'address',
      },
      {
        indexed: false,
        name: 'value',
        type: 'uint256',
      },
    ],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      {
        name: 'owner',
        type: 'address',
      },
      {
        name: 'spender',
        type: 'address',
      },
    ],
    outputs: [
      {
        type: 'uint256',
      },
    ],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'spender',
        type: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
      },
    ],
    outputs: [
      {
        type: 'bool',
      },
    ],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [
      {
        name: 'account',
        type: 'address',
      },
    ],
    outputs: [
      {
        type: 'uint256',
      },
    ],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        type: 'uint8',
      },
    ],
  },
  {
    type: 'function',
    name: 'name',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        type: 'string',
      },
    ],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        type: 'string',
      },
    ],
  },
  {
    type: 'function',
    name: 'totalSupply',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        type: 'uint256',
      },
    ],
  },
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'recipient',
        type: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
      },
    ],
    outputs: [
      {
        type: 'bool',
      },
    ],
  },
  {
    type: 'function',
    name: 'transferFrom',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'sender',
        type: 'address',
      },
      {
        name: 'recipient',
        type: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
      },
    ],
    outputs: [
      {
        type: 'bool',
      },
    ],
  },
] as const
