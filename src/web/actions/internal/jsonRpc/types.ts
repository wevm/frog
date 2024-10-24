export type JsonRpcResponseSuccess<resultType> = {
  jsonrpc: '2.0'
  id: string | number | null
  result: resultType
}

export type JsonRpcResponseError = {
  code: number
  message: string
}

export type JsonRpcResponseFailure = {
  jsonrpc: '2.0'
  id: string | number | null
  error: JsonRpcResponseError
}

export type JsonRpcMethod = 'fc_requestWalletAction' | 'fc_createCast'
