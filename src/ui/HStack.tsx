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
  | 'flexGrow'
  | 'gap'
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
  alignHorizontal?: 'left' | 'center' | 'right' | 'space-between'
  alignVertical?: 'top' | 'center' | 'bottom'
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
