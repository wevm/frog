import { getBoxProps, type BoxProps } from './Box.js'
import type { DefaultTokens, Tokens } from './tokens.js'

export type ImageProps<tokens extends Tokens = DefaultTokens> = Pick<
  BoxProps<tokens>,
  | 'height'
  | 'borderRadius'
  | 'borderBottomLeftRadius'
  | 'borderBottomRightRadius'
  | 'borderTopLeftRadius'
  | 'borderTopRightRadius'
  | 'objectFit'
  | 'width'
> & {
  src: string
}

export function Image<tokens extends Tokens>(props: ImageProps<tokens>) {
  const { src, ...rest } = props
  const boxProps = getBoxProps(rest)
  return <img {...boxProps} src={src} />
}
