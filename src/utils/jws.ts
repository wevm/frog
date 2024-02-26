import { CompactSign, compactVerify } from 'jose'

const decoder = new TextDecoder()
const encoder = new TextEncoder()

export async function verify(signature: string, secret: string) {
  const { payload } = await compactVerify(signature, encoder.encode(secret))
  return decoder.decode(payload)
}

export async function sign(message: string, secret: string) {
  return new CompactSign(encoder.encode(message))
    .setProtectedHeader({ alg: 'HS256' })
    .sign(encoder.encode(secret))
}
