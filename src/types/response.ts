export type TypedResponse<data> = {
  data: data
  format: 'frame' | 'transaction'
}

export type HandlerResponse<typedResponse> =
  | Response
  | TypedResponse<typedResponse>
  | Promise<Response | TypedResponse<typedResponse>>
