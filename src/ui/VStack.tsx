import { Box, type BoxProps } from './Box.js'
import type { DefaultTokens, Tokens } from './tokens.js'

export type VStackProps<tokens extends Tokens = DefaultTokens> = Pick<
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
  alignHorizontal?: 'left' | 'center' | 'right'
  alignVertical?: 'top' | 'center' | 'bottom' | 'space-between'
}

const alignHorizontalToAlignItems = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
} as const

const alignVerticalToJustifyContent = {
  top: 'flex-start',
  center: 'center',
  bottom: 'flex-end',
  'space-between': 'space-between',
} as const

export function VStack<tokens extends Tokens>({
  alignHorizontal,
  alignVertical,
  children,
  ...rest
}: VStackProps<tokens>) {
  return (
    <Box
      alignItems={
        alignHorizontal
          ? alignHorizontalToAlignItems[alignHorizontal]
          : undefined
      }
      justifyContent={
        alignVertical ? alignVerticalToJustifyContent[alignVertical] : undefined
      }
      display="flex"
      flexDirection="column"
      {...rest}
    >
      {children}
    </Box>
  )
}
