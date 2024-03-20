import type { CookieOptions } from 'hono/utils/cookie'

export const defaultHeaders = {
  'x-frog-dev': 'true',
} satisfies HeadersInit

export const defaultFid = 1

export const defaultCastId = {
  fid: defaultFid,
  hash: '0x0000000000000000000000000000000000000000',
}

export const defaultCookieOptions = {
  maxAge: 30 * 86_400,
  sameSite: 'Strict',
  secure: true,
} as CookieOptions

export const uiDistDir = '.frog'
