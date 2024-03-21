import type { Properties } from 'csstype'
import type { Child } from 'hono/jsx'

import { type DefaultTokens, type Tokens, defaultTokens } from './tokens.js'

export type BoxProps<tokens extends Tokens = DefaultTokens> = Properties & {
  __context?: { tokens?: Tokens | undefined }
  backgroundColor?: keyof tokens['colors']
  color?: keyof tokens['colors']
  children?: Child
  fontFamily?: keyof tokens['fonts']
  style?: Properties
}

export function Box({ __context, children, style, ...rest }: BoxProps) {
  const { colors } = __context?.tokens ?? (defaultTokens as any)

  const backgroundColor = rest.backgroundColor
    ? colors[rest.backgroundColor]
    : undefined
  const color = colors[rest.color ?? 'text']

  return (
    <div
      __context={__context}
      style={{
        ...rest,
        backgroundColor,
        color,
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
