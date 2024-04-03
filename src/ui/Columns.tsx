import { Box, type BoxProps } from './Box.js'
import { HStack, type HStackProps } from './HStack.js'
import type { Fraction } from './types.js'
import type { DefaultVars, Vars } from './vars.js'

export type ColumnsProps<vars extends Vars = DefaultVars> = HStackProps<vars>

export function Columns<vars extends Vars>({
  children,
  ...rest
}: ColumnsProps<vars>) {
  return (
    <HStack wrap={false} {...rest}>
      {children}
    </HStack>
  )
}
Columns.direction = 'vertical'

export type ColumnProps<vars extends Vars = DefaultVars> = Omit<
  BoxProps<vars>,
  'width'
> & {
  /** Sets the width span of the column (in fractions). */
  width?:
    | '1/1'
    | Fraction<2>
    | Fraction<3>
    | Fraction<4>
    | Fraction<5>
    | Fraction<6>
    | Fraction<7>
}

export function Column<vars extends Vars>({
  children,
  width = '1/1',
  ...rest
}: ColumnProps<vars>) {
  const [numerator, denominator] = width.split('/')

  return (
    <Box
      flex={`${Number(numerator) / Number(denominator)}`}
      height="100%"
      {...rest}
    >
      {children}
    </Box>
  )
}
Column.direction = 'vertical'
