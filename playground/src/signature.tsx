import { Button, Frog } from 'frog'

export const app = new Frog({ verify: 'silent', title: 'Signature' })
  .frame('/', (c) => {
    const transactionId = c.transactionId
    return c.res({
      image: (
        <div tw="flex flex-col items-center justify-center w-full h-full bg-black text-white font-bold text-5xl">
          {transactionId
            ? `${transactionId.slice(0, 6)}...${transactionId.slice(-6)}`
            : 'Sign Typed Data'}
        </div>
      ),
      intents: [
        <Button.Signature target="/sign">Sign Typed Data</Button.Signature>,
      ],
    })
  })
  // Sign Typed Data
  .signature('/sign', (c) =>
    c.signTypedData({
      chainId: 'eip155:84532',
      domain: {
        name: 'Ether Mail',
        version: '1',
        chainId: 1,
        verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
      },
      types: {
        Person: [
          { name: 'name', type: 'string' },
          { name: 'wallet', type: 'address' },
        ],
        Mail: [
          { name: 'from', type: 'Person' },
          { name: 'to', type: 'Person' },
          { name: 'contents', type: 'string' },
        ],
      },
      primaryType: 'Mail',
      message: {
        from: {
          name: 'Cow',
          wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
        },
        to: {
          name: 'Bob',
          wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
        },
        contents: 'Hello, Bob!',
      },
    }),
  )
