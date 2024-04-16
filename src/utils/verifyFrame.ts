import { bytesToHex, bytesToString, hexToBytes } from "viem";
import { FrameActionBody, Message } from "../protobufs/generated/message_pb.js";
import { type FrameData, type TrustedData } from "../types/frame.js";

export type VerifyFrameParameters = {
  frameUrl: string;
  trustedData: TrustedData;
  url: string;
};

export type VerifyFrameReturnType = {
  frameData: FrameData;
};

export async function verifyFrame({
  frameUrl,
  trustedData,
  url,
}: VerifyFrameParameters): Promise<VerifyFrameReturnType> {
  const bytes = hexToBytes(`0x${trustedData.messageBytes}`);

  const response = await fetch(
    "https://api.neynar.com/v2/farcaster/frame/validate",
    {
      method: "POST",
      headers: {
        accept: "application json",
        api_key: "NEYNAR_FROG_FM",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        message_bytes_in_hex: `0x${trustedData.messageBytes}`,
      }),
    }
  ).then((res) => res.json());

  if (!response.valid)
    throw new Error(`message is invalid. ${response.details}`);

  if (new URL(url).origin !== new URL(frameUrl).origin)
    throw new Error(`Invalid frame url: ${frameUrl}. Expected: ${url}.`);

  const message = Message.fromBinary(bytes);
  const frameData = messageToFrameData(message);
  return { frameData };
}

////////////////////////////////////////////////////////////////////
// Utilties

export function messageToFrameData(message: Message): FrameData {
  const frameActionBody = message.data?.body.value as FrameActionBody;
  const frameData: FrameData = {
    address: frameActionBody.address
      ? bytesToHex(frameActionBody.address)
      : undefined,
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
    inputText: bytesToString(frameActionBody.inputText),
    state: bytesToString(frameActionBody.state),
    transactionId: frameActionBody.transactionId
      ? bytesToHex(frameActionBody.transactionId)
      : undefined,
  };

  return frameData;
}
