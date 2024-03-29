import { getIconData, iconToHTML, iconToSVG } from '@iconify/utils'
import { encodeSvgForCss } from '@iconify/utils/lib/svg/encode-svg-for-css'

import { type BoxProps, resolveColorToken } from './Box.js'
import { icons } from './icons.js'
import { type DefaultTokens, type Tokens, defaultTokens } from './tokens.js'

export type IconProps<tokens extends Tokens = DefaultTokens> = {
  __context?: { tokens?: Tokens | undefined } | undefined
  color?: BoxProps<tokens>['backgroundColor']
  /**
   * @default auto
   */
  mode?: 'auto' | 'bg' | 'mask'
  /**
   * Icon names
   */
  name: tokens['icons'] extends string
    ? keyof IconCollectionMap[tokens['icons']]['icons'] extends infer name extends
        string
      ? name
      : never
    : AllIconNames
  size?: number
}

type AllIconNames = {
  [k in keyof typeof icons]: keyof IconCollectionMap[k]['icons'] extends infer name extends
    string
    ? `${k}:${name}`
    : never
}[keyof typeof icons]
type IconCollectionMap = {
  [k in keyof typeof icons]: (typeof icons)[k]
}

export function Icon<tokens extends Tokens>(props: IconProps<tokens>) {
  const { __context, mode = 'auto', size = 96 } = props

  let collection: string | undefined = __context?.tokens?.icons
  let name: string = props.name
  if (props.name.includes(':')) {
    const parts = props.name.split(':')
    collection = parts[0]
    name = parts[1]
  }

  const data = icons[collection as keyof typeof icons]
  if (!data) throw new TypeError(`Invalid set: ${collection}`)

  const item = getIconData(
    data as unknown as Parameters<typeof getIconData>[0],
    name,
  )
  if (!item) throw new TypeError(`Invalid icon: ${name}`)

  const svg = iconToSVG(item)
  let text = iconToHTML(svg.body, svg.attributes)

  const resolvedMode = (() => {
    if (mode === 'auto') return text.includes('currentColor') ? 'mask' : 'bg'
    return mode
  })()

  // ideally we would use `mask-image` (inspo: https://antfu.me/posts/icons-in-pure-css), but satori doesn't support `currentColor` on `background`
  if (resolvedMode === 'mask') {
    const { colors } = (__context?.tokens ?? defaultTokens) as Tokens
    const color = resolveColorToken(colors, props.color ?? 'gray700')
    text = text.replace(/currentColor/, color)
  }

  const url = `url("data:image/svg+xml;utf8,${encodeSvgForCss(text)}")`
  const sizePx = `${size}px`

  return (
    <div
      style={{
        backgroundColor: 'transparent',
        backgroundImage: url,
        backgroundSize: '100% 100%',
        display: 'flex',
        height: sizePx,
        width: sizePx,
      }}
    />
  )
}
