import { Box, type BoxProps } from './Box.js'
import type { DefaultTokens, Tokens } from './tokens.js'

export type CoverProps<tokens extends Tokens = DefaultTokens> = BoxProps<tokens>

export function Cover<tokens extends Tokens>({
  children,
  ...rest
}: CoverProps<tokens>) {
  return (
    <Box flexGrow="1" {...rest}>
      {children}
    </Box>
  )
}
