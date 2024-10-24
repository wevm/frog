export class JsonRpcError extends Error {
  code: number
  requestId: string
  constructor(requestId: string, code: number, message: string) {
    super(message)
    this.name = 'JsonRpcError'
    this.code = code
    this.requestId = requestId
  }
}
