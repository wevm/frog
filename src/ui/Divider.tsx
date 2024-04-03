import { Box, type BoxProps } from './Box.js'
import type { Direction } from './types.js'
import type { DefaultVars, Vars } from './vars.js'

export type DividerProps<vars extends Vars = DefaultVars> = Pick<
  BoxProps<vars>,
  'color'
> & {
  __context?: { direction?: Direction } | undefined
  /**
   * Sets the direction of the divider based on container.
   *
   * @default 'auto'
   */
  direction?: 'auto' | Direction | undefined
}

export function Divider<vars extends Vars = DefaultVars>(
  props: DividerProps<vars>,
) {
  const { __context, color, direction = 'auto' } = props
  const horizontalProps = { height: { custom: '1px' }, width: '100%' } as const
  const verticalProps = { height: '100%', width: { custom: '1px' } } as const
  const resolvedDirection =
    direction === 'auto' ? __context?.direction : direction
  const resolvedProps =
    resolvedDirection === 'horizontal' ? horizontalProps : verticalProps
  return (
    <Box
      backgroundColor={color ?? { custom: 'rgba(255,255,255,0.5)' }}
      {...resolvedProps}
    />
  )
}
