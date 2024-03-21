import { Box, type BoxProps } from './Box.js'
import type { DefaultTokens, Tokens } from './tokens.js'

export type VStackProps<tokens extends Tokens = DefaultTokens> =
  BoxProps<tokens>

export function VStack({ children, ...rest }: VStackProps) {
  return (
    <Box display="flex" flexDirection="column" {...rest}>
      {children}
    </Box>
  )
}
