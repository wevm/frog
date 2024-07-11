import { Box, type BoxProps } from './Box.js'
import type { DefaultVars, Vars } from './vars.js'

export type VStackProps<vars extends Vars = DefaultVars> = BoxProps<vars> & {
  /** Horizontally aligns the contents. */
  alignHorizontal?: 'left' | 'center' | 'right'
  /** Vertically aligns the contents. */
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

export function VStack<vars extends Vars>({
  alignHorizontal,
  alignVertical,
  children,
  ...rest
}: VStackProps<vars>) {
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
VStack.direction = 'horizontal'
