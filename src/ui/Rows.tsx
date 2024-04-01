import { Box, type BoxProps } from './Box.js'
import { VStack, type VStackProps } from './VStack.js'
import type { Fraction } from './types.js'
import type { DefaultVars, Vars } from './vars.js'

export type RowsProps<vars extends Vars = DefaultVars> = VStackProps<vars>

export function Rows<vars extends Vars>({
  children,
  ...rest
}: RowsProps<vars>) {
  return (
    <VStack height="100%" {...rest}>
      {children}
    </VStack>
  )
}
Rows.direction = 'horizontal'

export type RowProps<vars extends Vars = DefaultVars> = Omit<
  BoxProps<vars>,
  'height'
> & {
  /** Sets the height span of the column (in fractions). */
  height?:
    | '1/1'
    | Fraction<2>
    | Fraction<3>
    | Fraction<4>
    | Fraction<5>
    | Fraction<6>
    | Fraction<7>
}

export function Row<vars extends Vars>({
  children,
  height = '1/1',
  ...rest
}: RowProps<vars>) {
  const [numerator, denominator] = height.split('/')

  return (
    <Box flex={`${Number(numerator) / Number(denominator)}`} {...rest}>
      {children}
    </Box>
  )
}
Row.direction = 'horizontal'
