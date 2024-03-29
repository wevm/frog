import { Box, type BoxProps } from './Box.js'
import type { DefaultTokens, Tokens } from './tokens.js'

export type DividerProps<tokens extends Tokens = DefaultTokens> = Pick<
  BoxProps<tokens>,
  'color'
>

export function Divider<tokens extends Tokens = DefaultTokens>(
  props: BoxProps<tokens>,
) {
  const { color } = props
  return <Box backgroundColor={color} />
}
