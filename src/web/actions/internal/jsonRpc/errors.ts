export class JsonRpcError extends Error {
  code: number
  requestId: string
  constructor(requestId: string, code: number, message: string) {
    super(`Request ${requestId} failed with code ${code}`, {
      cause: message,
    })
    this.name = 'JsonRpcError'
    this.code = code
    this.requestId = requestId
  }
}
