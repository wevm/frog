import type { Child } from 'hono/jsx'
import { Box, type BoxProps } from './Box.js'
import type { DefaultTokens, Tokens } from './tokens.js'

export type CoverProps<tokens extends Tokens = DefaultTokens> =
  BoxProps<tokens> & {
    children: Child
  }

export function Cover({ children, ...rest }: CoverProps) {
  return (
    <Box flexGrow="1" {...rest}>
      {children}
    </Box>
  )
}