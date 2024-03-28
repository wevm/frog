import { Box, type TokenValue } from './Box.js'
import type { DefaultTokens, Tokens } from './tokens.js'

export type SpacerProps<tokens extends Tokens = DefaultTokens> = {
  /** Sets the size of the spacing. */
  size?: TokenValue<'width', keyof tokens['units']>
}

export function Spacer<tokens extends Tokens>({ size }: SpacerProps<tokens>) {
  return <Box grow={size ? undefined : true} height={size} width={size} />
}
