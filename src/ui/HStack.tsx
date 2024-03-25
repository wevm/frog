import { Box, type BoxProps } from './Box.js'
import type { DefaultTokens, Tokens } from './tokens.js'

export type HStackProps<tokens extends Tokens = DefaultTokens> =
  BoxProps<tokens>

export function HStack({ children, ...rest }: HStackProps) {
  return (
    <Box display="flex" flexDirection="row" {...rest}>
      {children}
    </Box>
  )
}
