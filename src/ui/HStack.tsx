import { Box, type BoxProps } from './Box.js'
import type { DefaultVars, Vars } from './vars.js'

export type HStackProps<vars extends Vars = DefaultVars> = BoxProps<vars> & {
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

export function HStack<vars extends Vars>({
  alignHorizontal = 'left',
  alignVertical = 'top',
  children,
  wrap = true,
  ...rest
}: HStackProps<vars>) {
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
HStack.direction = 'vertical'
