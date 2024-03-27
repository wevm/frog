import { Text, type TextProps } from './Text.js'
import type { DefaultTokens, Tokens } from './tokens.js'

export type HeadingProps<tokens extends Tokens = DefaultTokens> =
  TextProps<tokens>

export function Heading<tokens extends Tokens>({
  children,
  size = '32' as any,
  tracking = '-1' as any,
  weight = '700',
  ...rest
}: HeadingProps<tokens>) {
  return (
    <Text tracking={tracking} size={size} weight={weight} {...rest}>
      {children}
    </Text>
  )
}
