import { Text, type TextProps } from './Text.js'
import type { DefaultTokens, Tokens } from './tokens.js'

export type HeadingProps<tokens extends Tokens = DefaultTokens> =
  TextProps<tokens>

export function Heading<tokens extends Tokens>({
  children,
  size = '32' as keyof tokens['fontSizes'],
  weight = '700',
  ...rest
}: HeadingProps<tokens>) {
  return (
    <Text size={size} weight={weight} {...rest}>
      {children}
    </Text>
  )
}
