import { Box, type BoxProps } from './Box.js'
import type { DefaultTokens, Tokens } from './tokens.js'

export type HStackProps<tokens extends Tokens = DefaultTokens> = Pick<
  BoxProps<tokens>,
  | 'bottom'
  | 'children'
  | 'flex'
  | 'flexBasis'
  | 'flexFlow'
  | 'flexShrink'
  | 'gap'
  | 'grow'
  | 'height'
  | 'left'
  | 'maxHeight'
  | 'maxWidth'
  | 'maxWidth'
  | 'minWidth'
  | 'padding'
  | 'paddingBottom'
  | 'paddingLeft'
  | 'paddingRight'
  | 'paddingTop'
  | 'right'
  | 'top'
  | 'width'
> & {
  /** Horizontally aligns the contents. */
  alignHorizontal?: 'left' | 'center' | 'right' | 'space-between'
  /** Vertically aligns the contents. */
  alignVertical?: 'top' | 'center' | 'bottom'
  /** Wraps the contents if they overflow. */
  wrap?: boolean
}

const alignHorizontalToJustifyContent = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
  'space-between': 'space-between',
} as const

const alignVerticalToAlignItems = {
  top: 'flex-start',
  center: 'center',
  bottom: 'flex-end',
} as const

export function HStack<tokens extends Tokens>({
  alignHorizontal = 'left',
  alignVertical = 'top',
  children,
  wrap = true,
  ...rest
}: HStackProps<tokens>) {
  return (
    <Box
      alignContent={wrap ? alignVerticalToAlignItems[alignVertical] : undefined}
      alignItems={!wrap ? alignVerticalToAlignItems[alignVertical] : undefined}
      display="flex"
      flexDirection="row"
      justifyContent={alignHorizontalToJustifyContent[alignHorizontal]}
      flexWrap={wrap ? 'wrap' : 'nowrap'}
      {...rest}
    >
      {children}
    </Box>
  )
}