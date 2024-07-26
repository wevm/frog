import type { Context as Context_Hono, HonoRequest, Input } from 'hono'
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
  contextHono: Context_Hono<env, path, input>
  initialState:
    | ((c: Context_Hono<env>) => _state | Promise<_state>)
    | _state
    | undefined
  req: HonoRequest
}

type GetSignatureContextReturnType<
  env extends Env = Env,
  path extends string = string,
  input extends Input = {},
  //
  _state = env['State'],
> = Promise<{
  context: SignatureContext<env, path, input, _state>
}>

export async function getSignatureContext<
  env extends Env,
  path extends string,
  input extends Input,
  //
  _state = env['State'],
>(
  parameters: GetSignatureContextParameters<env, path, input, _state>,
): GetSignatureContextReturnType<env, path, input, _state> {
  const { context, contextHono } = parameters
  const {
    env,
    frameData,
    initialPath,
    previousButtonValues,
    req,
    status,
    verified,
    url,
  } = context || {}

  const previousState = await (async () => {
    if (context.previousState) return context.previousState

    if (typeof parameters.initialState === 'function')
      return await (parameters.initialState as any)(contextHono)
    return parameters.initialState
  })()

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
      previousState: previousState as any,
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
        const { chainId, ...params } = parameters
        return this.res({
          params: params as any,
          chainId,
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
