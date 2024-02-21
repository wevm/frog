import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { mnemonicToAccount } from 'viem/accounts'

export const config = {
  runtime: 'edge',
}

const app = new Hono()

app
  .get('/ping', (c) => c.text('pong'))
  .get('/signed-key-requests/:publicKey', async (c) => {
    const key = c.req.param('publicKey') as `0x${string}`

    const appFid = process.env.APP_FID
    if (!appFid) throw new Error('Missing APP_FID')

    const appMnemonic = process.env.APP_MNEMONIC
    if (!appMnemonic) throw new Error('Missing APP_MNEMONIC')

    const account = mnemonicToAccount(appMnemonic)
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
        requestFid: BigInt(appFid),
        key,
        deadline: BigInt(deadline),
      },
    })

    return c.json({ deadline, signature, requestFid: appFid })
  })

export default handle(app)
