import {
  type PostJsonRpcRequestMessageReturnType,
  postJsonRpcRequestMessage,
} from './jsonRpc/postJsonRpcRequestMessage.js'

export type CreateCastRequestMessageParameters = {
  embeds: string[]
  text: string
}

export type CreateCastRequestMessageReturnType =
  PostJsonRpcRequestMessageReturnType

export function postCreateCastRequestMessage(
  parameters: CreateCastRequestMessageParameters,
  requestIdOverride?: string,
) {
  return postJsonRpcRequestMessage(
    'fc_createCast',
    parameters,
    requestIdOverride,
  )
}
