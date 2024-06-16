import type { Context } from 'hono'

export function validateFramePostBody(
  value: Record<string, string | File>,
  c: Context,
) {
  const buttonIndex = Number.parseInt(value.buttonIndex as string)
  if (buttonIndex < 1 || buttonIndex > 4)
    return c.text('Invalid data, missing buttonIndex', 400)

  const url = value.url as string
  if (!url) return c.text('Invalid data, missing url', 400)

  const inputText = value.inputText as string | undefined
  const state = value.state as string | undefined

  const fid = value.fid ? Number.parseInt(value.fid as string) : undefined
  const castId = (value.castId as unknown as { fid: number; hash: string }) ?? {
    fid: 1,
    hash: '0x0000000000000000000000000000000000000000',
  }

  return {
    buttonIndex,
    castId,
    fid,
    inputText,
    state,
    url,
  } as const
}
