import type { Properties } from 'csstype'
import type { Child } from 'hono/jsx'

import { type DefaultTokens, type Tokens, defaultTokens } from './tokens.js'

type SatoriStyleProperties = Pick<
  Properties,
  | 'alignContent'
  | 'alignSelf'
  | 'backgroundClip'
  | 'backgroundColor'
  | 'backgroundImage'
  | 'backgroundPosition'
  | 'backgroundRepeat'
  | 'backgroundSize'
  | 'border'
  | 'borderBottom'
  | 'borderBottomColor'
  | 'borderBottomLeftRadius'
  | 'borderBottomRightRadius'
  | 'borderBottomWidth'
  | 'borderColor'
  | 'borderLeft'
  | 'borderLeftColor'
  | 'borderLeftWidth'
  | 'borderRadius'
  | 'borderRight'
  | 'borderRightColor'
  | 'borderRightWidth'
  | 'borderTop'
  | 'borderTopColor'
  | 'borderTopLeftRadius'
  | 'borderTopRightRadius'
  | 'borderTopWidth'
  | 'bottom'
  | 'boxShadow'
  | 'color'
  | 'clipPath'
  | 'flex'
  | 'flexFlow'
  | 'flexGrow'
  | 'flexShrink'
  | 'fontFamily'
  | 'fontSize'
  | 'fontStyle'
  | 'filter'
  | 'gap'
  | 'height'
  | 'justifyContent'
  | 'left'
  | 'letterSpacing'
  | 'lineClamp'
  | 'lineHeight'
  | 'margin'
  | 'marginTop'
  | 'marginBottom'
  | 'marginLeft'
  | 'marginRight'
  | 'padding'
  | 'paddingTop'
  | 'paddingBottom'
  | 'paddingLeft'
  | 'paddingRight'
  | 'maskImage'
  | 'maskPosition'
  | 'maskSize'
  | 'maskRepeat'
  | 'opacity'
  | 'right'
  | 'tabSize'
  | 'textShadow'
  | 'transform'
  | 'transformOrigin'
  | 'top'
  | 'width'
> & {
  alignItems?: Extract<
    Properties['alignItems'],
    'stretch' | 'center' | 'flex-start' | 'flex-end' | 'baseline' | 'normal'
  >
  borderStyle?: Extract<Properties['borderStyle'], 'dashed' | 'solid'>
  borderBottomStyle?: Extract<
    Properties['borderBottomStyle'],
    'dashed' | 'solid'
  >
  borderLeftStyle?: Extract<Properties['borderLeftStyle'], 'dashed' | 'solid'>
  borderRightStyle?: Extract<Properties['borderRightStyle'], 'dashed' | 'solid'>
  borderTopStyle?: Extract<Properties['borderTopStyle'], 'dashed' | 'solid'>
  display?: Extract<Properties['display'], 'none' | 'flex'>
  flexBasis?: Exclude<Properties['flexBasis'], 'auto'>
  flexDirection?: Extract<
    Properties['flexDirection'],
    'row' | 'column' | 'row-reverse' | 'column-reverse'
  >
  flexWrap?: Extract<Properties['flexWrap'], 'wrap' | 'nowrap' | 'wrap-reverse'>
  fontWeight?:
    | '100'
    | '200'
    | '300'
    | '400'
    | '500'
    | '600'
    | '700'
    | '800'
    | '900'
  maxHeight?: Exclude<
    Properties['maxHeight'],
    'min-content' | 'max-content' | 'fit-content'
  >
  minHeight?: Exclude<
    Properties['minHeight'],
    'min-content' | 'max-content' | 'fit-content'
  >
  maxWidth?: Exclude<
    Properties['maxWidth'],
    'min-content' | 'max-content' | 'fit-content'
  >
  minWidth?: Exclude<
    Properties['minWidth'],
    'min-content' | 'max-content' | 'fit-content'
  >
  objectFit?: Extract<Properties['objectFit'], 'contain' | 'cover' | 'none'>
  overflow?: Extract<Properties['overflow'], 'hidden' | 'visible'>
  position?: Extract<Properties['display'], 'absolute' | 'relative'>
  textAlign?: Extract<
    Properties['textAlign'],
    'start' | 'end' | 'center' | 'left' | 'right' | 'justify'
  >
  textDecoration?: Extract<
    Properties['textDecoration'],
    'underline' | 'line-through' | 'dotted' | 'dashed' | 'solid'
  >
  textOverflow?: Extract<Properties['textTransform'], 'clip' | 'ellipsis'>
  textTransform?: Extract<
    Properties['textTransform'],
    'none' | 'lowercase' | 'uppercase' | 'capitalize'
  >
  textWrap?: 'balance' | 'wrap'
  whiteSpace?: Extract<
    Properties['whiteSpace'],
    'normal' | 'nowrap' | 'pre' | 'pre-line' | 'pre-wrap'
  >
  wordBreak?: Extract<
    Properties['wordBreak'],
    'normal' | 'break-all' | 'break-word' | 'keep-all'
  >
}

type TokenValue<property extends keyof SatoriStyleProperties, token> =
  | token
  | { custom: SatoriStyleProperties[property] }

export type BoxProps<tokens extends Tokens = DefaultTokens> = Omit<
  SatoriStyleProperties,
  | 'backgroundColor'
  | 'borderColor'
  | 'borderBottomColor'
  | 'borderLeftColor'
  | 'borderRightColor'
  | 'borderTopColor'
  | 'color'
  | 'fontFamily'
> & {
  __context?: { tokens?: Tokens | undefined }
  backgroundColor?: TokenValue<'backgroundColor', keyof tokens['colors']>
  borderColor?: TokenValue<'borderColor', keyof tokens['colors']>
  borderBottomColor?: TokenValue<'borderBottomColor', keyof tokens['colors']>
  borderLeftColor?: TokenValue<'borderLeftColor', keyof tokens['colors']>
  borderRightColor?: TokenValue<'borderRightColor', keyof tokens['colors']>
  borderTopColor?: TokenValue<'borderTopColor', keyof tokens['colors']>
  children?: Child
  color?: TokenValue<'color', keyof tokens['colors']>
  fontFamily?: TokenValue<'fontFamily', keyof tokens['fonts']>
}

export function Box({ __context, children, ...rest }: BoxProps) {
  const { colors, fonts } = (__context?.tokens ?? defaultTokens) as Tokens

  const backgroundColor = resolveToken(colors, rest.backgroundColor)
  const borderColor = resolveToken(colors, rest.borderColor)
  const borderBottomColor = resolveToken(colors, rest.borderBottomColor)
  const borderLeftColor = resolveToken(colors, rest.borderLeftColor)
  const borderRightColor = resolveToken(colors, rest.borderRightColor)
  const borderTopColor = resolveToken(colors, rest.borderTopColor)
  const color = resolveToken(colors, rest.color, colors?.text)

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
        borderColor,
        borderBottomColor,
        borderLeftColor,
        borderRightColor,
        borderTopColor,
        color,
        display: 'flex',
        flexDirection: 'column',
        fontFamily,
      }}
    >
      {children}
    </div>
  )
}

function resolveToken(
  tokens: Record<string, string> | undefined,
  value: TokenValue<keyof SatoriStyleProperties, string> | undefined,
  fallback?: string,
) {
  if (!value) return fallback
  if (typeof value === 'object') return value.custom
  return tokens?.[value]
}
