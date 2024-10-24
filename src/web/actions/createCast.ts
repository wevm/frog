import type { JsonRpcResponseError } from './internal/jsonRpc/types.js'
import type { FcCreateCastSuccessBody } from './internal/waitForCreateCastResponse.js'
import {
  type CreateCastRequestMessageParameters,
  postCreateCastRequestMessage,
} from './internal/postCreateCastRequestMessage.js'
import { waitForCreateCastResponse } from './internal/waitForCreateCastResponse.js'

type CreateCastParameters = CreateCastRequestMessageParameters
type CreateCastReturnType = FcCreateCastSuccessBody
type CreateCastErrorType = JsonRpcResponseError
export type { CreateCastParameters, CreateCastReturnType, CreateCastErrorType }

export async function createCast(
  parameters: CreateCastParameters,
  requestIdOverride?: string,
): Promise<CreateCastReturnType> {
  const requestId = postCreateCastRequestMessage(parameters, requestIdOverride)
  return waitForCreateCastResponse(requestId)
}
