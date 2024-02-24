import { Message } from '@farcaster/core'
import {
  FrameActionBody,
  NobleEd25519Signer,
  makeFrameAction,
} from '@farcaster/core'
import { bytesToHex, hexToBytes } from '@noble/curves/abstract/utils'
import { ed25519 } from '@noble/curves/ed25519'

export type FetchFrameParameters = {
  body: {
    buttonIndex: number
    castId: {
      fid: number
      hash: string
    }
    fid: number
    inputText: string | undefined
    state: string | undefined
    url: string
  }
  privateKey: string | undefined
}

export async function fetchFrame(parameters: FetchFrameParameters) {
  const { body, privateKey } = parameters
  const { buttonIndex, castId, fid, inputText, state, url } = body

  const privateKeyBytes = privateKey
    ? hexToBytes(privateKey.slice(2))
    : ed25519.utils.randomPrivateKey()

  const frameActionBody = FrameActionBody.create({
    url: Buffer.from(url),
    buttonIndex,
    castId: {
      fid: castId.fid,
      hash: hexToBytes(castId.hash.slice(2)),
    },
    inputText: inputText ? Buffer.from(inputText) : undefined,
  })
  const frameActionMessage = await makeFrameAction(
    frameActionBody,
    { fid, network: 1 },
    new NobleEd25519Signer(privateKeyBytes),
  )
  const message = frameActionMessage._unsafeUnwrap()

  try {
    performance.mark('start')
    return await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        untrustedData: {
          buttonIndex,
          castId,
          fid,
          inputText: inputText
            ? Buffer.from(inputText).toString('utf-8')
            : undefined,
          messageHash: `0x${bytesToHex(message.hash)}`,
          network: 1,
          state,
          timestamp: message.data?.timestamp,
          url,
        },
        trustedData: {
          messageBytes: Buffer.from(Message.encode(message).finish()).toString(
            'hex',
          ),
        },
      }),
    })
  } finally {
    // finally always called even after return or throw so we can mark the end to measure performance
    performance.mark('end')
  }
}
