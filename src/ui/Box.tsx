import type { JSX } from 'hono/jsx/jsx-runtime'
import type {
  Child,
  Direction,
  SatoriStyleProperties,
  ValueOf,
} from './types.js'
import { type DefaultVars, type Vars, defaultVars } from './vars.js'

export type VariableValue<property extends keyof SatoriStyleProperties, token> =
  | token
  | { custom: SatoriStyleProperties[property] }

type WithNegatedValues<obj extends object | undefined> = ValueOf<{
  [key in keyof obj]: key extends `${number}` ? `-${key}` | key : key
}>

export type BoxProps<vars extends Vars = DefaultVars> = Omit<
  SatoriStyleProperties,
  | 'background'
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
  | 'borderWidth'
  | 'bottom'
  | 'color'
  | 'fontFamily'
  | 'fontSize'
  | 'height'
  | 'gap'
  | 'left'
  | 'letterSpacing'
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
  | 'paddingRight'
  | 'right'
  | 'top'
  | 'width'
> & {
  __context?:
    | { direction?: Direction | undefined; vars?: Vars | undefined }
    | undefined
  alignHorizontal?: 'left' | 'center' | 'right' | 'space-between'
  alignVertical?: 'top' | 'center' | 'bottom' | 'space-between'
  background?: VariableValue<'backgroundColor', keyof vars['colors']>
  backgroundColor?: VariableValue<'backgroundColor', keyof vars['colors']>
  borderColor?: VariableValue<'borderColor', keyof vars['colors']>
  borderBottomColor?: VariableValue<'borderBottomColor', keyof vars['colors']>
  borderBottomLeftRadius?: VariableValue<
    'borderBottomLeftRadius',
    keyof vars['units']
  >
  borderBottomRightRadius?: VariableValue<
    'borderBottomRightRadius',
    keyof vars['units']
  >
  borderBottomWidth?: VariableValue<'borderBottomWidth', keyof vars['units']>
  borderLeftColor?: VariableValue<'borderLeftColor', keyof vars['colors']>
  borderLeftWidth?: VariableValue<'borderLeftWidth', keyof vars['units']>
  borderRadius?: VariableValue<'borderRadius', keyof vars['units']>
  borderRightColor?: VariableValue<'borderRightColor', keyof vars['colors']>
  borderRightWidth?: VariableValue<'borderRightWidth', keyof vars['units']>
  borderTopColor?: VariableValue<'borderTopColor', keyof vars['colors']>
  borderTopLeftRadius?: VariableValue<
    'borderTopLeftRadius',
    keyof vars['units']
  >
  borderTopRightRadius?: VariableValue<
    'borderTopRightRadius',
    keyof vars['units']
  >
  borderTopWidth?: VariableValue<'borderTopWidth', keyof vars['units']>
  borderWidth?: VariableValue<'borderWidth', keyof vars['units']>
  bottom?: VariableValue<'bottom', keyof vars['units']>
  children?: JSX.Element | JSX.Element[] | Child | undefined
  color?: VariableValue<'color', keyof vars['colors']>
  fontFamily?: VariableValue<'fontFamily', keyof vars['fonts']>
  fontSize?: VariableValue<'fontSize', keyof vars['fontSizes']>
  height?: VariableValue<'height', keyof vars['units'] | '100%'>
  gap?: VariableValue<'gap', keyof vars['units']>
  grow?: boolean
  left?: VariableValue<'left', keyof vars['units']>
  letterSpacing?: VariableValue<
    'letterSpacing',
    keyof vars['units'] | WithNegatedValues<vars['units']>
  >
  lineHeight?: VariableValue<'lineHeight', keyof vars['units']>
  margin?: VariableValue<'margin', WithNegatedValues<vars['units']>>
  marginTop?: VariableValue<'marginTop', WithNegatedValues<vars['units']>>
  marginBottom?: VariableValue<'marginBottom', WithNegatedValues<vars['units']>>
  marginLeft?: VariableValue<'marginLeft', WithNegatedValues<vars['units']>>
  marginRight?: VariableValue<'marginRight', WithNegatedValues<vars['units']>>
  maxHeight?: VariableValue<'maxHeight', keyof vars['units'] | '100%'>
  minHeight?: VariableValue<'minHeight', keyof vars['units'] | '100%'>
  maxWidth?: VariableValue<'maxWidth', keyof vars['units'] | '100%'>
  minWidth?: VariableValue<'minWidth', keyof vars['units'] | '100%'>
  padding?: VariableValue<'padding', keyof vars['units']>
  paddingTop?: VariableValue<'paddingTop', keyof vars['units']>
  paddingBottom?: VariableValue<'paddingBottom', keyof vars['units']>
  paddingLeft?: VariableValue<'paddingLeft', keyof vars['units']>
  paddingRight?: VariableValue<'paddingRight', keyof vars['units']>
  right?: VariableValue<'right', keyof vars['units']>
  top?: VariableValue<'top', keyof vars['units']>
  width?: VariableValue<'width', keyof vars['units'] | '100%'>
}

const alignHorizontalToAlignItems = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
  'space-between': 'space-between',
} as const

const alignVerticalToJustifyContent = {
  top: 'flex-start',
  center: 'center',
  bottom: 'flex-end',
  'space-between': 'space-between',
} as const

export function Box<vars extends Vars>({
  __context,
  children,
  grow,
  // @ts-ignore - private
  src,
  ...rest
}: BoxProps<vars>) {
  const { __context: _, ...boxProps } = getBoxProps({
    __context,
    children,
    grow,
    ...rest,
  })
  if (src) return <img {...boxProps} src={src} />
  return <div {...boxProps}>{children}</div>
}

function getBoxProps<vars extends Vars>({
  __context,
  children,
  grow,
  ...rest
}: BoxProps<vars>) {
  const { colors, fonts, frame, units } = (__context?.vars ??
    defaultVars) as Vars

  const vheight = frame?.height ?? 630
  const vwidth = frame?.width ?? 1200
  const vmax = Math.max(vwidth, vheight)

  const display = rest.display ?? 'flex'
  const flexDirection = rest.flexDirection ?? 'column'

  const background = resolveColorToken(colors, rest.background)
  const backgroundColor = resolveColorToken(colors, rest.backgroundColor)
  const borderBottomColor = resolveColorToken(colors, rest.borderBottomColor)
  const borderBottomLeftRadius = resolveUnitToken(
    units,
    rest.borderBottomLeftRadius,
    vmax,
  )
  const borderBottomRightRadius = resolveUnitToken(
    units,
    rest.borderBottomRightRadius,
    vmax,
  )
  const borderBottomWidth = resolveUnitToken(
    units,
    rest.borderBottomWidth,
    vmax,
  )
  const borderColor = resolveColorToken(colors, rest.borderColor)
  const borderLeftColor = resolveColorToken(colors, rest.borderLeftColor)
  const borderLeftWidth = resolveUnitToken(units, rest.borderLeftWidth, vmax)
  const borderRadius = resolveUnitToken(units, rest.borderRadius, vmax)
  const borderRightColor = resolveColorToken(colors, rest.borderRightColor)
  const borderRightWidth = resolveUnitToken(units, rest.borderRightWidth, vmax)
  const borderTopColor = resolveColorToken(colors, rest.borderTopColor)
  const borderTopLeftRadius = resolveUnitToken(
    units,
    rest.borderTopLeftRadius,
    vmax,
  )
  const borderTopRightRadius = resolveUnitToken(
    units,
    rest.borderTopRightRadius,
    vmax,
  )
  const borderTopWidth = resolveUnitToken(units, rest.borderTopWidth, vmax)
  const borderWidth = resolveUnitToken(units, rest.borderWidth, vmax)
  const bottom = resolveUnitToken(units, rest.bottom, vmax)
  const color = resolveColorToken(colors, rest.color, colors?.text)
  const fontSize = resolveUnitToken(units, rest.fontSize, vmax, units?.[16])
  const height = resolveUnitToken(units, rest.height, vmax)
  const gap = resolveUnitToken(units, rest.gap, vmax)
  const left = resolveUnitToken(units, rest.left, vmax)
  const letterSpacing = resolveUnitToken(units, rest.letterSpacing, vwidth)
  const lineHeight = resolveUnitToken(units, rest.lineHeight, vheight)
  const margin = resolveUnitToken(units, rest.margin, vmax)
  const marginTop = resolveUnitToken(units, rest.marginTop, vmax)
  const marginBottom = resolveUnitToken(units, rest.marginBottom, vmax)
  const marginLeft = resolveUnitToken(units, rest.marginLeft, vmax)
  const marginRight = resolveUnitToken(units, rest.marginRight, vmax)
  const padding = resolveUnitToken(units, rest.padding, vmax)
  const paddingTop = resolveUnitToken(units, rest.paddingTop, vmax)
  const paddingBottom = resolveUnitToken(units, rest.paddingBottom, vmax)
  const paddingLeft = resolveUnitToken(units, rest.paddingLeft, vmax)
  const paddingRight = resolveUnitToken(units, rest.paddingRight, vmax)
  const right = resolveUnitToken(units, rest.right, vmax)
  const top = resolveUnitToken(units, rest.top, vmax)
  const width = resolveUnitToken(units, rest.width, vmax)

  const fontFamily = (() => {
    if (!rest.fontFamily) return fonts?.default?.[0]?.name
    if (typeof rest.fontFamily === 'object') return rest.fontFamily.custom
    return fonts?.[rest.fontFamily as any]?.[0]?.name
  })()

  const alignItems = (() => {
    if (rest.alignItems) return rest.alignItems
    if (flexDirection === 'column') {
      if (!rest.alignHorizontal) return
      return alignHorizontalToAlignItems[rest.alignHorizontal]
    }
    if (!rest.alignVertical) return
    return alignVerticalToJustifyContent[rest.alignVertical]
  })()

  const justifyContent = (() => {
    if (rest.justifyContent) return rest.justifyContent
    if (flexDirection === 'column') {
      if (!rest.alignVertical) return
      return alignVerticalToJustifyContent[rest.alignVertical]
    }
    if (!rest.alignHorizontal) return
    return alignHorizontalToAlignItems[rest.alignHorizontal]
  })()

  const flexGrow = (() => {
    if (rest.flexGrow) return rest.flexGrow
    return grow ? '1' : undefined
  })()

  const style = {
    ...rest,
    alignItems,
    background,
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
    borderWidth,
    bottom,
    color,
    display,
    flexDirection,
    flexGrow,
    fontFamily,
    fontSize,
    height,
    justifyContent,
    gap,
    left,
    letterSpacing,
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
  } as const

  // remove `undefined` values from style prop
  for (const key of Object.keys(style)) {
    if (style[key as keyof typeof style]) continue
    delete style[key as keyof typeof style]
  }

  return { __context, style }
}

function resolveToken<vars extends Record<string, unknown>>(
  vars: vars | undefined,
  value: VariableValue<keyof SatoriStyleProperties, keyof vars> | undefined,
  fallback?: unknown,
):
  | { value: vars[keyof vars]; type: 'token' }
  | { value: string; type: 'custom' } {
  if (value === undefined) return { type: 'token', value: fallback } as any
  if (typeof value === 'object')
    return { type: 'custom', value: value.custom } as any
  return { type: 'token', value: vars?.[value] } as any
}

export function resolveColorToken(
  colors: Vars['colors'] | undefined,
  value: VariableValue<keyof SatoriStyleProperties, any> | undefined,
  fallback?: unknown,
) {
  const color = resolveToken(colors, value, fallback)
  return color.value
}

export function resolveUnitToken(
  units: Vars['units'] | undefined,
  value: VariableValue<keyof SatoriStyleProperties, any> | undefined,
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
  if (unit.value === undefined) return undefined
  const resolved =
    (typeof value === 'string' && value.startsWith('-') ? -1 : +1) *
    unit.value *
    baseUnit
  return `${resolved}px`
}
