import { Box, type TokenValue } from './Box.js'
import type { DefaultTokens, Tokens } from './tokens.js'

export type SpacerProps<tokens extends Tokens = DefaultTokens> = {
  size?: TokenValue<'width', keyof tokens['units']>
}

export function Spacer({ size }: SpacerProps) {
  return <Box flex={size ? undefined : '1'} height={size} width={size} />
}