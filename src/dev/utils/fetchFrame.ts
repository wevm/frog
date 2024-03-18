import { bytesToHex, hexToBytes } from '@noble/curves/abstract/utils'
import { ed25519 } from '@noble/curves/ed25519'
import { blake3 } from '@noble/hashes/blake3'
import { toBytes } from '@noble/hashes/utils'

import {
  FarcasterNetwork,
  FrameActionBody,
  HashScheme,
  Message,
  MessageData,
  MessageType,
  SignatureScheme,
} from '../../protobufs/generated/message_pb.js'
import { defaultHeaders } from '../constants.js'

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
  }
  privateKey: string | undefined
  url: string
}

export async function fetchFrame(parameters: FetchFrameParameters) {
  const { body, privateKey, url } = parameters
  const { buttonIndex, castId, fid, inputText, state } = body

  const network = FarcasterNetwork.MAINNET
  const epoch = 1_609_459_200_000 // January 1, 2021 UTC
  const timestamp = Math.round((Date.now() - epoch) / 1000)

  // TODO: Add additional validation
  // https://github.com/farcasterxyz/hub-monorepo/blob/main/packages/core/src/validations.ts#L777
  if (timestamp > 2 ** 32 - 1) throw new Error('time too far in future')
  if (typeof fid !== 'number' || fid <= 0 || !Number.isInteger(fid))
    throw new Error('Invalid fid')
  if (!Object.values(FarcasterNetwork).includes(network))
    throw new Error('Invalid network')

  const frameActionBody = new FrameActionBody({
    buttonIndex,
    castId: {
      fid: BigInt(castId.fid),
      hash: hexToBytes(castId.hash.slice(2)),
    },
    inputText: inputText ? toBytes(inputText) : undefined,
    state: state ? toBytes(state) : undefined,
    url: toBytes(url),
    // TODO: Add transactionId
  })

  const messageData = new MessageData({
    body: { case: 'frameActionBody', value: frameActionBody },
    fid: BigInt(fid),
    network,
    timestamp,
    type: MessageType.FRAME_ACTION,
  })

  const dataBytes = messageData.toBinary()
  const hash = blake3(dataBytes, { dkLen: 20 })
  const privateKeyBytes = privateKey
    ? hexToBytes(privateKey.slice(2))
    : ed25519.utils.randomPrivateKey()
  const message = new Message({
    data: messageData,
    hash,
    hashScheme: HashScheme.BLAKE3,
    signature: ed25519.sign(hash, privateKeyBytes),
    signatureScheme: SignatureScheme.ED25519,
    signer: ed25519.getPublicKey(privateKeyBytes),
  })
  const messageBytes = bytesToHex(message.toBinary())

  const t0 = performance.now()
  let response: Response | undefined
  let error: Error | undefined
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify({
        untrustedData: {
          buttonIndex,
          castId,
          fid,
          inputText: inputText ? inputText : undefined,
          messageHash: `0x${bytesToHex(message.hash)}`,
          network,
          state,
          timestamp: message.data?.timestamp,
          url,
        },
        trustedData: {
          messageBytes,
        },
      }),
    })
  } catch (err) {
    error = err as Error
  }

  const t1 = performance.now()
  const speed = t1 - t0
  return { error, response, speed }
}
