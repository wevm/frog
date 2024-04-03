import { Text, type TextProps } from './Text.js'
import type { DefaultVars, Vars } from './vars.js'

export type HeadingProps<vars extends Vars = DefaultVars> = TextProps<vars>

export function Heading<vars extends Vars>({
  children,
  size = '32' as any,
  tracking = '-1' as any,
  weight = '700',
  ...rest
}: HeadingProps<vars>) {
  return (
    <Text tracking={tracking} size={size} weight={weight} {...rest}>
      {children}
    </Text>
  )
}
