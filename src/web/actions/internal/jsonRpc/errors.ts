export class JsonRpcError extends Error {
  constructor(requestId: string, code: number, message: string) {
    super(`Request ${requestId} failed with code ${code} – ${message}`)
    this.name = 'JsonRpcError'
  }
}
