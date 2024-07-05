import type { HonoRequest, Input } from 'hono'
import type { Context, SignatureContext } from '../types/context.js'
import type { Env } from '../types/env.js'
import type { SignatureResponse } from '../types/signature.js'
import { getIntentState } from './getIntentState.js'

type GetSignatureContextParameters<
  env extends Env = Env,
  path extends string = string,
  input extends Input = {},
  //
  _state = env['State'],
> = {
  context: Context<env, path, input, _state>
  req: HonoRequest
}

type GetSignatureContextReturnType<
  env extends Env = Env,
  path extends string = string,
  input extends Input = {},
  //
  _state = env['State'],
> = {
  context: SignatureContext<env, path, input, _state>
}

export function getSignatureContext<
  env extends Env,
  path extends string,
  input extends Input,
  //
  _state = env['State'],
>(
  parameters: GetSignatureContextParameters<env, path, input, _state>,
): GetSignatureContextReturnType<env, path, input, _state> {
  const { context } = parameters
  const {
    env,
    frameData,
    initialPath,
    previousButtonValues,
    previousState,
    req,
    status,
    verified,
    url,
  } = context || {}

  const { buttonValue, inputText } = getIntentState({
    buttonValues: previousButtonValues || [],
    frameData,
  })

  return {
    context: {
      address: frameData?.address!,
      buttonIndex: frameData?.buttonIndex,
      buttonValue,
      env,
      error: (data) => ({
        error: data,
        format: 'signature',
        status: 'error',
      }),
      frameData,
      initialPath,
      inputText,
      previousButtonValues,
      previousState,
      req,
      res(parameters) {
        const { chainId, method, params } = parameters

        const { domain, types, primaryType, message } = params
        const response: SignatureResponse = {
          chainId,
          method,
          params: {
            domain,
            types,
            primaryType,
            // @TODO: fix typing
            message: message!,
          },
        }

        return { data: response, format: 'signature', status: 'success' }
      },
      signTypedData(parameters) {
        return this.res({
          params: parameters as any,
          chainId: parameters.chainId,
          method: 'eth_signTypedData_v4',
        })
      },
      status,
      var: context.var,
      verified,
      url,
    },
  }
}
