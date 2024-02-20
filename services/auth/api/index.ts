import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { mnemonicToAccount } from 'viem/accounts'

export const config = {
  runtime: 'edge',
}

const app = new Hono()

app.get('/signed-key-requests/:publicKey', async (c) => {
  const publicKey = c.req.param('publicKey') as `0x${string}`

  const fid = process.env.APP_FID
  const mnemonic = process.env.APP_MNEMONIC
  if (!fid || !mnemonic) throw new Error('Missing APP_FID or APP_MNEMONIC')

  const account = mnemonicToAccount(mnemonic)
  const deadline = Math.floor(Date.now() / 1000) + 60 * 60 // now + hour
  const signature = await account.signTypedData({
    domain: {
      name: 'Farcaster SignedKeyRequestValidator',
      version: '1',
      chainId: 10,
      verifyingContract: '0x00000000FC700472606ED4fA22623Acf62c60553',
    },
    types: {
      SignedKeyRequest: [
        { name: 'requestFid', type: 'uint256' },
        { name: 'key', type: 'bytes' },
        { name: 'deadline', type: 'uint256' },
      ],
    },
    primaryType: 'SignedKeyRequest',
    message: {
      requestFid: BigInt(fid),
      key: publicKey,
      deadline: BigInt(deadline),
    },
  })

  return c.json({ signature })
})

export default handle(app)
