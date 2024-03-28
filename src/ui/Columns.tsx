import { Box, type BoxProps } from './Box.js'
import { HStack, type HStackProps } from './HStack.js'
import type { DefaultTokens, Tokens } from './tokens.js'
import type { Fraction } from './types.js'

export type ColumnsProps<tokens extends Tokens = DefaultTokens> =
  HStackProps<tokens>

export function Columns<tokens extends Tokens>({
  children,
  ...rest
}: ColumnsProps<tokens>) {
  return (
    <HStack wrap={false} {...rest}>
      {children}
    </HStack>
  )
}

export type ColumnProps<tokens extends Tokens = DefaultTokens> = Omit<
  BoxProps<tokens>,
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

export function Column<tokens extends Tokens>({
  children,
  width = '1/1',
  ...rest
}: ColumnProps<tokens>) {
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
