import { Box, type VariableValue } from './Box.js'
import type { DefaultVars, Vars } from './vars.js'

export type SpacerProps<vars extends Vars = DefaultVars> = {
  /** Sets the size of the spacing. */
  size?: VariableValue<'width', keyof vars['units']>
}

export function Spacer<vars extends Vars>({ size }: SpacerProps<vars>) {
  return <Box grow={size ? undefined : true} height={size} width={size} />
}
