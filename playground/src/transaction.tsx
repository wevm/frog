import { Button, Frog } from 'frog'

export const app = new Frog({ verify: 'silent', title: 'Transaction' })
  .frame('/', (c) => {
    const transactionId = c.transactionId
    return c.res({
      image: (
        <div tw="flex flex-col items-center justify-center w-full h-full bg-black text-white font-bold text-5xl">
          {transactionId
            ? `${transactionId.slice(0, 6)}...${transactionId.slice(-6)}`
            : 'Send Transaction'}
        </div>
      ),
      intents: transactionId
        ? [
            <Button.Link
              href={`https://base-sepolia.blockscout.com/tx/${transactionId}`}
            >
              View on Block Explorer
            </Button.Link>,
          ]
        : [
            <Button.Transaction action="/end" target="/raw-send">
              Raw
            </Button.Transaction>,
            <Button.Transaction target="/send">
              Send Transaction
            </Button.Transaction>,
            <Button.Transaction target="/error">
              Invoke Error
            </Button.Transaction>,
            <Button.Transaction target="/mint">Mint</Button.Transaction>,
          ],
    })
  })
  .frame('/frame-sign', (c) => {
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
        <Button.Transaction target="/sign">Sign Typed Data</Button.Transaction>,
      ],
    })
  })
  .frame('/end', (c) => {
    const transactionId = c.transactionId
    if (!transactionId)
      return c.res({
        image: (
          <div tw="flex flex-col items-center justify-center w-full h-full bg-black text-white font-bold text-5xl">
            end: no transactionId
          </div>
        ),
      })

    return c.res({
      image: (
        <div tw="flex flex-col items-center justify-center w-full h-full bg-black text-white font-bold text-5xl">
          end: {transactionId.slice(0, 6)}...{transactionId.slice(-6)}
        </div>
      ),
      intents: [
        <Button.Link
          href={`https://base-sepolia.blockscout.com/tx/${transactionId}`}
        >
          View on Block Explorer
        </Button.Link>,
      ],
    })
  })
  // Custom error
  .transaction('/error', (c) =>
    c.error({ message: `bad transaction ${Math.random()}` }),
  )
  // Raw Transaction
  .transaction('/raw-send', (c) => {
    return c.res({
      chainId: 'eip155:84532',
      method: 'eth_sendTransaction',
      params: {
        to: '0xA0Cf798816D4b9b9866b5330EEa46a18382f251e',
        value: 1n,
      },
    })
  })
  // Send Transaction
  .transaction('/send', (c) => {
    return c.send({
      chainId: 'eip155:84532',
      to: '0xA0Cf798816D4b9b9866b5330EEa46a18382f251e',
      value: 1n,
    })
  })
  // Contract Transaction
  .transaction('/mint', (c) => {
    return c.contract({
      abi: wagmiExampleAbi,
      chainId: 'eip155:84532',
      functionName: 'mint',
      to: '0xFBA3912Ca04dd458c843e2EE08967fC04f3579c2',
      args: [123n],
    })
  })
  // Send Transaction (params)
  .transaction('/send/:value', (c) => {
    return c.send({
      chainId: 'eip155:84532',
      to: '0xA0Cf798816D4b9b9866b5330EEa46a18382f251e',
      value: BigInt(c.req.param('value')),
    })
  })
  // Sign Typed Data
  .transaction('/sign', (c) =>
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

/////////////////////////////////////////////////////////////////////
// Constants

export const wagmiExampleAbi = [
  { inputs: [], stateMutability: 'nonpayable', type: 'constructor' },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'approved',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'Approval',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      { indexed: false, internalType: 'bool', name: 'approved', type: 'bool' },
    ],
    name: 'ApprovalForAll',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'from', type: 'address' },
      { indexed: true, internalType: 'address', name: 'to', type: 'address' },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'Transfer',
    type: 'event',
  },
  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'getApproved',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'operator', type: 'address' },
    ],
    name: 'isApprovedForAll',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'from', type: 'address' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'from', type: 'address' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'bytes', name: '_data', type: 'bytes' },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'operator', type: 'address' },
      { internalType: 'bool', name: 'approved', type: 'bool' },
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes4', name: 'interfaceId', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'from', type: 'address' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const
