import type { Child } from 'hono/jsx'

import { type DefaultTokens, type Tokens, defaultTokens } from './tokens.js'
import type { SatoriStyleProperties, ValueOf } from './types.js'

export type TokenValue<property extends keyof SatoriStyleProperties, token> =
  | token
  | { custom: SatoriStyleProperties[property] }

type NegateValues<obj extends object | undefined> = ValueOf<{
  [key in keyof obj]: key extends `${number}` ? `-${key}` : key
}>

export type BoxProps<tokens extends Tokens = DefaultTokens> = Omit<
  SatoriStyleProperties,
  | 'backgroundColor'
  | 'borderColor'
  | 'borderBottomColor'
  | 'borderBottomLeftRadius'
  | 'borderBottomRightRadius'
  | 'borderBottomWidth'
  | 'borderLeftColor'
  | 'borderLeftWidth'
  | 'borderRadius'
  | 'borderRightColor'
  | 'borderRightWidth'
  | 'borderTopColor'
  | 'borderTopLeftRadius'
  | 'borderTopRightRadius'
  | 'borderTopWidth'
  | 'bottom'
  | 'color'
  | 'fontFamily'
  | 'fontSize'
  | 'height'
  | 'gap'
  | 'left'
  | 'lineHeight'
  | 'margin'
  | 'marginTop'
  | 'marginBottom'
  | 'marginLeft'
  | 'marginRight'
  | 'maxHeight'
  | 'minHeight'
  | 'maxWidth'
  | 'minWidth'
  | 'padding'
  | 'paddingTop'
  | 'paddingBottom'
  | 'paddingLeft'
  | 'paddingRight'
  | 'right'
  | 'top'
  | 'width'
> & {
  __context?: { tokens?: Tokens | undefined }
  backgroundColor?: TokenValue<'backgroundColor', keyof tokens['colors']>
  borderColor?: TokenValue<'borderColor', keyof tokens['colors']>
  borderBottomColor?: TokenValue<'borderBottomColor', keyof tokens['colors']>
  borderBottomLeftRadius?: TokenValue<
    'borderBottomLeftRadius',
    keyof tokens['units']
  >
  borderBottomRightRadius?: TokenValue<
    'borderBottomRightRadius',
    keyof tokens['units']
  >
  borderBottomWidth?: TokenValue<'borderBottomWidth', keyof tokens['units']>
  borderLeftColor?: TokenValue<'borderLeftColor', keyof tokens['colors']>
  borderLeftWidth?: TokenValue<'borderLeftWidth', keyof tokens['units']>
  borderRadius?: TokenValue<'borderRadius', keyof tokens['units']>
  borderRightColor?: TokenValue<'borderRightColor', keyof tokens['colors']>
  borderRightWidth?: TokenValue<'borderRightWidth', keyof tokens['units']>
  borderTopColor?: TokenValue<'borderTopColor', keyof tokens['colors']>
  borderTopLeftRadius?: TokenValue<'borderTopLeftRadius', keyof tokens['units']>
  borderTopRightRadius?: TokenValue<
    'borderTopRightRadius',
    keyof tokens['units']
  >
  borderTopWidth?: TokenValue<'borderTopWidth', keyof tokens['units']>
  bottom?: TokenValue<'bottom', keyof tokens['units']>
  children?: Child
  color?: TokenValue<'color', keyof tokens['colors']>
  fontFamily?: TokenValue<'fontFamily', keyof tokens['fonts']>
  fontSize?: TokenValue<'fontSize', keyof tokens['units']>
  height?: TokenValue<'height', keyof tokens['units'] | '100%'>
  gap?: TokenValue<'gap', keyof tokens['units']>
  left?: TokenValue<'left', keyof tokens['units']>
  lineHeight?: TokenValue<'lineHeight', keyof tokens['units']>
  margin?: TokenValue<'margin', NegateValues<tokens['units']>>
  marginTop?: TokenValue<'marginTop', NegateValues<tokens['units']>>
  marginBottom?: TokenValue<'marginBottom', NegateValues<tokens['units']>>
  marginLeft?: TokenValue<'marginLeft', NegateValues<tokens['units']>>
  marginRight?: TokenValue<'marginRight', NegateValues<tokens['units']>>
  maxHeight?: TokenValue<'maxHeight', keyof tokens['units'] | '100%'>
  minHeight?: TokenValue<'minHeight', keyof tokens['units'] | '100%'>
  maxWidth?: TokenValue<'maxWidth', keyof tokens['units'] | '100%'>
  minWidth?: TokenValue<'minWidth', keyof tokens['units'] | '100%'>
  padding?: TokenValue<'padding', keyof tokens['units']>
  paddingTop?: TokenValue<'paddingTop', keyof tokens['units']>
  paddingBottom?: TokenValue<'paddingBottom', keyof tokens['units']>
  paddingLeft?: TokenValue<'paddingLeft', keyof tokens['units']>
  paddingRight?: TokenValue<'paddingRight', keyof tokens['units']>
  right?: TokenValue<'right', keyof tokens['units']>
  top?: TokenValue<'top', keyof tokens['units']>
  width?: TokenValue<'width', keyof tokens['units'] | '100%'>
}

export function Box<tokens extends Tokens>({
  __context,
  children,
  ...rest
}: BoxProps<tokens>) {
  const { colors, fonts, frame, units } = (__context?.tokens ??
    defaultTokens) as Tokens

  const vheight = frame?.height ?? 1200
  const vwidth = frame?.width ?? 630
  const vmin = Math.min(vwidth, vheight)
  const vmax = Math.max(vwidth, vheight)

  const backgroundColor = resolveColorToken(colors, rest.backgroundColor)
  const borderBottomColor = resolveColorToken(colors, rest.borderBottomColor)
  const borderBottomLeftRadius = resolveUnitToken(
    units,
    rest.borderBottomLeftRadius,
    vmin,
  )
  const borderBottomRightRadius = resolveUnitToken(
    units,
    rest.borderBottomRightRadius,
    vmin,
  )
  const borderBottomWidth = resolveUnitToken(
    units,
    rest.borderBottomWidth,
    vmin,
  )
  const borderColor = resolveColorToken(colors, rest.borderColor)
  const borderLeftColor = resolveColorToken(colors, rest.borderLeftColor)
  const borderLeftWidth = resolveUnitToken(units, rest.borderLeftWidth, vmin)
  const borderRadius = resolveUnitToken(units, rest.borderRadius, vmin)
  const borderRightColor = resolveColorToken(colors, rest.borderRightColor)
  const borderRightWidth = resolveUnitToken(units, rest.borderRightWidth, vmin)
  const borderTopColor = resolveColorToken(colors, rest.borderTopColor)
  const borderTopLeftRadius = resolveUnitToken(
    units,
    rest.borderTopLeftRadius,
    vmin,
  )
  const borderTopRightRadius = resolveUnitToken(
    units,
    rest.borderTopRightRadius,
    vmin,
  )
  const borderTopWidth = resolveUnitToken(units, rest.borderTopWidth, vmin)
  const bottom = resolveUnitToken(units, rest.bottom, vheight)
  const color = resolveColorToken(colors, rest.color, colors?.text)
  const fontSize = resolveUnitToken(units, rest.fontSize, vmax, units?.[16])
  const height = resolveUnitToken(units, rest.height, vheight)
  const gap = resolveUnitToken(units, rest.gap, vheight)
  const left = resolveUnitToken(units, rest.left, vwidth)
  const lineHeight = resolveUnitToken(units, rest.lineHeight, vmin)
  const margin = resolveUnitToken(units, rest.margin, vmax)
  const marginTop = resolveUnitToken(units, rest.marginTop, vmin)
  const marginBottom = resolveUnitToken(units, rest.marginBottom, vmin)
  const marginLeft = resolveUnitToken(units, rest.marginLeft, vmin)
  const marginRight = resolveUnitToken(units, rest.marginRight, vmin)
  const padding = resolveUnitToken(units, rest.padding, vmax)
  const paddingTop = resolveUnitToken(units, rest.paddingTop, vmin)
  const paddingBottom = resolveUnitToken(units, rest.paddingBottom, vmin)
  const paddingLeft = resolveUnitToken(units, rest.paddingLeft, vmin)
  const paddingRight = resolveUnitToken(units, rest.paddingRight, vmin)
  const right = resolveUnitToken(units, rest.right, vwidth)
  const top = resolveUnitToken(units, rest.top, vheight)
  const width = resolveUnitToken(units, rest.width, vwidth)

  const fontFamily = (() => {
    if (!rest.fontFamily) return fonts?.default[0].name
    if (typeof rest.fontFamily === 'object') return rest.fontFamily.custom
    return fonts?.[rest.fontFamily as any][0].name
  })()

  const display = rest.display ?? 'flex'
  const flexDirection = rest.flexDirection ?? 'column'

  return (
    <div
      __context={__context}
      style={{
        ...rest,
        backgroundColor,
        borderColor,
        borderBottomColor,
        borderBottomLeftRadius,
        borderBottomRightRadius,
        borderBottomWidth,
        borderLeftColor,
        borderLeftWidth,
        borderRadius,
        borderRightColor,
        borderRightWidth,
        borderTopLeftRadius,
        borderTopRightRadius,
        borderTopColor,
        borderTopWidth,
        bottom,
        color,
        display,
        flexDirection,
        fontFamily,
        fontSize,
        height,
        gap,
        left,
        lineHeight,
        margin,
        marginTop,
        marginBottom,
        marginLeft,
        marginRight,
        padding,
        paddingTop,
        paddingBottom,
        paddingLeft,
        paddingRight,
        right,
        top,
        width,
      }}
    >
      {children}
    </div>
  )
}

function resolveToken<tokens extends Record<string, unknown>>(
  tokens: tokens | undefined,
  value: TokenValue<keyof SatoriStyleProperties, keyof tokens> | undefined,
  fallback?: unknown,
):
  | { value: tokens[keyof tokens]; type: 'token' }
  | { value: string; type: 'custom' } {
  if (!value) return { type: 'token', value: fallback } as any
  if (typeof value === 'object')
    return { type: 'custom', value: value.custom } as any
  return { type: 'token', value: tokens?.[value] } as any
}

function resolveColorToken(
  colors: Tokens['colors'] | undefined,
  value: TokenValue<keyof SatoriStyleProperties, any> | undefined,
  fallback?: unknown,
) {
  const color = resolveToken(colors, value, fallback)
  return color.value
}

function resolveUnitToken(
  units: Tokens['units'] | undefined,
  value: TokenValue<keyof SatoriStyleProperties, any> | undefined,
  baseUnit: number,
  fallback?: unknown,
) {
  const normalizedValue = (() => {
    if (typeof value === 'string' && value.startsWith('-'))
      return value.slice(1)
    return value
  })()

  const unit = resolveToken(units, normalizedValue, fallback)
  if (normalizedValue === '100%' || unit.value === '100%') return '100%'
  if (unit.type === 'custom') return unit.value
  if (!unit.value) return undefined
  return (
    (typeof value === 'string' && value.startsWith('-') ? -1 : +1) *
    unit.value *
    baseUnit
  )
}
