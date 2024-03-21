import type { Properties } from 'csstype'
import type { Child } from 'hono/jsx'

import { type DefaultTokens, type Tokens, defaultTokens } from './tokens.js'

type TokenValue<property extends keyof Properties, token> =
  | token
  | { custom: Properties[property] }

export type BoxProps<tokens extends Tokens = DefaultTokens> = Omit<
  Properties,
  'backgroundColor' | 'color' | 'fontFamily'
> & {
  __context?: { tokens?: Tokens | undefined }
  backgroundColor?: TokenValue<'backgroundColor', keyof tokens['colors']>
  color?: TokenValue<'color', keyof tokens['colors']>
  children?: Child
  fontFamily?: TokenValue<'fontFamily', keyof tokens['fonts']>
  style?: Properties
}

export function Box({ __context, children, style, ...rest }: BoxProps) {
  const { colors, fonts } = (__context?.tokens ?? defaultTokens) as Tokens

  const backgroundColor = (() => {
    if (!rest.backgroundColor) return undefined
    if (typeof rest.backgroundColor === 'object')
      return rest.backgroundColor.custom
    return colors?.[rest.backgroundColor]
  })()
  const color = (() => {
    if (!rest.color) return colors?.text
    if (typeof rest.color === 'object') return rest.color.custom
    return colors?.[rest.color]
  })()
  const fontFamily = (() => {
    if (!rest.fontFamily) return fonts?.default[0].name
    if (typeof rest.fontFamily === 'object') return rest.fontFamily.custom
    return fonts?.[rest.fontFamily][0].name
  })()

  return (
    <div
      __context={__context}
      style={{
        ...rest,
        backgroundColor,
        color,
        display: 'flex',
        flexDirection: 'column',
        fontFamily,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
