import { bytesToHex, bytesToString } from 'viem'
import type {
  FrameActionBody,
  Message,
} from '../protobufs/generated/message_pb.js'
import type { ComposerActionData } from '../types/composerAction.js'
import { type VerifyMessageParameters, verifyMessage } from './verifyMessage.js'

export type VerifyComposerActionParameters = VerifyMessageParameters

export type VerifyComposerActionReturnType = {
  composerActionData: ComposerActionData
}

export async function verifyComposerAction(
  parameters: VerifyComposerActionParameters,
): Promise<VerifyComposerActionReturnType> {
  const { message } = await verifyMessage(parameters)
  const composerActionData = messageToComposerActionData(message)
  return { composerActionData }
}

////////////////////////////////////////////////////////////////////
// Utilties

export function messageToComposerActionData(
  message: Message,
): ComposerActionData {
  const frameActionBody = message.data?.body.value as FrameActionBody
  const composerActionData: ComposerActionData = {
    fid: Number(message.data?.fid!),
    messageHash: bytesToHex(message.hash),
    network: message.data?.network!,
    timestamp: message.data?.timestamp!,
    state: JSON.parse(decodeURIComponent(bytesToString(frameActionBody.state))),
    url: bytesToString(frameActionBody.url),
    buttonIndex: frameActionBody.buttonIndex as any,
  }

  return composerActionData
}
