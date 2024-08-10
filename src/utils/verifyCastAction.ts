import { bytesToHex, bytesToString } from 'viem'
import type {
  FrameActionBody,
  Message,
} from '../protobufs/generated/message_pb.js'
import type { CastActionData } from '../types/castAction.js'
import { type VerifyMessageParameters, verifyMessage } from './verifyMessage.js'

export type VerifyCastActionParameters = VerifyMessageParameters

export type VerifyCastActionReturnType = {
  castActionData: CastActionData
}

export async function verifyCastAction(
  parameters: VerifyCastActionParameters,
): Promise<VerifyCastActionReturnType> {
  const { message } = await verifyMessage(parameters)
  const castActionData = messageToCastActionData(message)
  return { castActionData }
}

////////////////////////////////////////////////////////////////////
// Utilties

export function messageToCastActionData(message: Message): CastActionData {
  const frameActionBody = message.data?.body.value as FrameActionBody
  const castActionData: CastActionData = {
    castId: {
      fid: Number(frameActionBody.castId?.fid),
      hash: bytesToHex(frameActionBody.castId?.hash!),
    },
    fid: Number(message.data?.fid!),
    messageHash: bytesToHex(message.hash),
    network: message.data?.network!,
    timestamp: message.data?.timestamp!,
    url: bytesToString(frameActionBody.url),
    buttonIndex: frameActionBody.buttonIndex as any,
  }

  return castActionData
}
