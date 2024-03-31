import { Box, type BoxProps } from './Box.js'
import type { DefaultVars, Vars } from './vars.js'

export type DividerProps<vars extends Vars = DefaultVars> = Pick<
  BoxProps<vars>,
  'color'
>

export function Divider<vars extends Vars = DefaultVars>(
  props: BoxProps<vars>,
) {
  const { color } = props
  return <Box backgroundColor={color} />
}
