import { Box, type BoxProps, resolveColorToken } from './Box.js'
import { icons } from './icons.js'
import { type DefaultVars, type Vars, defaultVars } from './vars.js'

export type IconProps<
  vars extends Vars = DefaultVars,
  collection extends Vars['icons'] = DefaultVars['icons'],
> = {
  __context?: { vars?: Vars | undefined } | undefined
  /**
   * Sets the color of the icon.
   *
   * Note: This prop is only supported when {@link mode} is `'mask'` or `'auto'` (and the icon with {@link name} is inferred as `'mask'`).
   */
  color?: BoxProps<vars>['backgroundColor']
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
  collection?: collection | Vars['icons'] | undefined
  /** Icon name in the current icon collection. */
  name: keyof (typeof icons)[collection extends keyof typeof icons
    ? collection
    : never]
  /** Sets the size of the icon. */
  size?: BoxProps<vars>['width']
}

export function Icon<
  vars extends Vars,
  collection extends Vars['icons'] = DefaultVars['icons'],
>(props: IconProps<vars, collection>) {
  const {
    __context,
    collection = __context?.vars?.icons ?? 'lucide',
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
    const { colors } = (__context?.vars ?? defaultVars) as Vars
    const color = resolveColorToken(colors, props.color ?? 'gray700')
    text = text.replace(/currentColor/g, encodeURIComponent(color))
  }

  return (
    <Box
      __context={__context}
      backgroundImage={`url('data:image/svg+xml;utf8,${text}')`}
      backgroundColor={{ custom: 'transparent' }}
      backgroundSize="100% 100%"
      height={size as keyof Vars['units']}
      width={size as keyof Vars['units']}
    />
  )
}
