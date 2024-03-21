import type { Child } from 'hono/jsx'
import { Box, type BoxProps } from './Box.js'

export type VStackProps = { children: Child; gap: BoxProps['gap'] }

export function VStack({ children, gap }: VStackProps) {
  return (
    <Box display="flex" flexDirection="column" gap={gap}>
      {children}
    </Box>
  )
}
