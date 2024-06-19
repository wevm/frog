import type { BaseError } from '../../types/response.js'

export async function responseToBaseErrorMessage(
  response: Response,
): Promise<string> {
  const { message }: Pick<BaseError, 'message'> = await response.json()
  return message
}
