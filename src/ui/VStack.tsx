import { Box, type BoxProps } from './Box.js'
import type { DefaultTokens, Tokens } from './tokens.js'

export type VStackProps<tokens extends Tokens = DefaultTokens> =
  BoxProps<tokens> & {
    gap: BoxProps['gap']
  }

export function VStack({ children, gap }: VStackProps) {
  return (
    <Box display="flex" flexDirection="column" gap={gap}>
      {children}
    </Box>
  )
}
