import type { Child } from 'hono/jsx'
import { Box, type BoxProps } from './Box.js'
import type { DefaultTokens, Tokens } from './tokens.js'

export type TextProps<tokens extends Tokens = DefaultTokens> = {
  align?: BoxProps<tokens>['textAlign']
  children: Child
  color?: BoxProps<tokens>['color']
  decoration?: BoxProps<tokens>['textDecoration']
  font?: BoxProps<tokens>['fontFamily']
  overflow?: BoxProps<tokens>['textOverflow']
  shadow?: BoxProps<tokens>['textShadow']
  size?: BoxProps<tokens>['fontSize']
  style?: BoxProps<tokens>['fontStyle']
  tracking?: BoxProps<tokens>['letterSpacing']
  transform?: BoxProps<tokens>['textTransform']
  weight?: BoxProps<tokens>['fontWeight']
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
