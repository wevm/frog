import { Message } from '@farcaster/core'
import {
  FrameActionBody,
  NobleEd25519Signer,
  makeFrameAction,
} from '@farcaster/core'
import { bytesToHex, hexToBytes } from '@noble/curves/abstract/utils'
import { ed25519 } from '@noble/curves/ed25519'

export async function fetchFrame({
  buttonIndex,
  castId,
  fid,
  inputText,
  postUrl,
  state,
  privateKey,
}: {
  buttonIndex: number
  castId: {
    fid: number
    hash: Uint8Array
  }
  fid: number
  inputText: string | undefined
  postUrl: string
  state: string | undefined
  privateKey: `0x${string}` | undefined
}) {
  const privateKeyBytes = privateKey
    ? hexToBytes(privateKey.slice(2))
    : ed25519.utils.randomPrivateKey()

  const frameActionBody = FrameActionBody.create({
    url: Buffer.from(postUrl),
    buttonIndex,
    castId,
    inputText: inputText ? Buffer.from(inputText) : undefined,
  })
  const frameActionMessage = await makeFrameAction(
    frameActionBody,
    { fid, network: 1 },
    new NobleEd25519Signer(privateKeyBytes),
  )

  const message = frameActionMessage._unsafeUnwrap()

  const t0 = performance.now()
  const response = await fetch(postUrl, {
    method: 'POST',
    body: JSON.stringify({
      untrustedData: {
        buttonIndex,
        castId: {
          fid: castId.fid,
          hash: `0x${bytesToHex(castId.hash)}`,
        },
        fid,
        inputText: inputText
          ? Buffer.from(inputText).toString('utf-8')
          : undefined,
        messageHash: `0x${bytesToHex(message.hash)}`,
        network: 1,
        state,
        timestamp: message.data?.timestamp,
        url: postUrl,
      },
      trustedData: {
        messageBytes: Buffer.from(Message.encode(message).finish()).toString(
          'hex',
        ),
      },
    }),
  })
  const t1 = performance.now()
  const speed = t1 - t0
  return { response, speed }
}
