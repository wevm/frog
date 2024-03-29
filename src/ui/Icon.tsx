import { Box, type BoxProps, resolveColorToken } from './Box.js'
import { icons } from './icons.js'
import { type DefaultTokens, type Tokens, defaultTokens } from './tokens.js'

export type IconProps<
  tokens extends Tokens = DefaultTokens,
  collection extends Tokens['icons'] = DefaultTokens['icons'],
> = {
  __context?: { tokens?: Tokens | undefined } | undefined
  /**
   * Sets the color of the icon.
   *
   * Note: This prop is only supported when {@link mode} is `'mask'` or `'auto'` (and the icon with {@link name} is inferred as `'mask'`).
   */
  color?: BoxProps<tokens>['backgroundColor']
  /**
   * Sets rendering mode of the icon.
   *
   * @default auto
   */
  mode?: 'auto' | 'bg' | 'mask' | undefined
  /**
   * Icon collection to use for resolving icons.
   *
   * @default 'lucide'
   */
  collection?: collection | Tokens['icons'] | undefined
  /** Icon name in the current icon collection. */
  name: keyof (typeof icons)[collection extends keyof typeof icons
    ? collection
    : never]
  /** Sets the size of the icon. */
  size?: BoxProps<tokens>['width']
}

export function Icon<
  tokens extends Tokens,
  collection extends Tokens['icons'] = DefaultTokens['icons'],
>(props: IconProps<tokens, collection>) {
  const {
    __context,
    collection = __context?.tokens?.icons ?? 'lucide',
    mode = 'auto',
    name,
    size = '24',
  } = props

  const iconMap = icons[collection]
  let text: string = iconMap[name as keyof typeof iconMap]
  if (!text) throw new TypeError(`Invalid set: ${collection}`)

  const resolvedMode = (() => {
    if (mode === 'auto') return text.includes('currentColor') ? 'mask' : 'bg'
    return mode
  })()

  // ideally we would use `mask-image`, but satori doesn't support `currentColor` on `background`
  // so need to inject color into svg content directly
  // inspo: https://antfu.me/posts/icons-in-pure-css
  if (resolvedMode === 'mask') {
    const { colors } = (__context?.tokens ?? defaultTokens) as Tokens
    const color = resolveColorToken(colors, props.color ?? 'gray700')
    text = text.replace(/currentColor/g, encodeURIComponent(color))
  }

  return (
    <Box
      __context={__context}
      backgroundImage={`url('data:image/svg+xml;utf8,${text}')`}
      backgroundColor={{ custom: 'transparent' }}
      backgroundSize="100% 100%"
      height={size as keyof Tokens['units']}
      width={size as keyof Tokens['units']}
    />
  )
}
