import type { Child } from 'hono/jsx'
import { Box, type BoxProps } from './Box.js'
import type { DefaultTokens, Tokens } from './tokens.js'

export type TextProps<tokens extends Tokens = DefaultTokens> = {
  /** Sets the horizontal alignment of the text. */
  align?: BoxProps<tokens>['textAlign']
  children: Child
  /** Sets the color of the text. */
  color?: BoxProps<tokens>['color']
  /** Sets the text decoration. */
  decoration?: BoxProps<tokens>['textDecoration']
  /** Sets the font family of the text. */
  font?: BoxProps<tokens>['fontFamily']
  /** Sets the overflow behavior of the text. */
  overflow?: BoxProps<tokens>['textOverflow']
  /** Sets the shadow of the text. */
  shadow?: BoxProps<tokens>['textShadow']
  /** Sets the size of the font. */
  size?: BoxProps<tokens>['fontSize']
  /** Sets the style of the font. */
  style?: BoxProps<tokens>['fontStyle']
  /** Sets the horizontal spacing behavior between text characters. */
  tracking?: BoxProps<tokens>['letterSpacing']
  /** Sets the transform behavior of the text. */
  transform?: BoxProps<tokens>['textTransform']
  /** Sets the weight (or boldness) of the font. */
  weight?: BoxProps<tokens>['fontWeight']
  /** Defines how the text should be wrapped. */
  wrap?: true | 'balance'
}

const alignToAlignItems = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
} as const

export function Text<tokens extends Tokens>({
  align,
  children,
  color,
  decoration,
  font,
  overflow,
  shadow,
  style,
  size,
  tracking,
  transform,
  weight,
  wrap,
}: TextProps<tokens>) {
  return (
    <Box
      alignItems={align ? (alignToAlignItems as any)[align] : undefined}
      color={color}
      fontFamily={font}
      fontSize={size}
      fontStyle={style}
      fontWeight={weight}
      letterSpacing={tracking}
      textDecoration={decoration}
      textOverflow={overflow}
      textShadow={shadow}
      textTransform={transform}
      textWrap={wrap === true ? 'wrap' : wrap}
    >
      {children}
    </Box>
  )
}
