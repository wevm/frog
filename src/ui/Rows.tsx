import { Box, type BoxProps } from './Box.js'
import { VStack, type VStackProps } from './VStack.js'
import type { DefaultTokens, Tokens } from './tokens.js'
import type { Fraction } from './types.js'

export type RowsProps<tokens extends Tokens = DefaultTokens> =
  VStackProps<tokens>

export function Rows<tokens extends Tokens>({
  children,
  ...rest
}: RowsProps<tokens>) {
  return (
    <VStack height="100%" {...rest}>
      {children}
    </VStack>
  )
}

export type RowProps<tokens extends Tokens = DefaultTokens> = Omit<
  BoxProps<tokens>,
  'height'
> & {
  height?:
    | '1/1'
    | Fraction<2>
    | Fraction<3>
    | Fraction<4>
    | Fraction<5>
    | Fraction<6>
    | Fraction<7>
}

export function Row<tokens extends Tokens>({
  children,
  height = '1/1',
  ...rest
}: RowProps<tokens>) {
  const [numerator, denominator] = height.split('/')

  return (
    <Box flex={`${Number(numerator) / Number(denominator)}`} {...rest}>
      {children}
    </Box>
  )
}
