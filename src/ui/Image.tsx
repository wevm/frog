import { type BoxProps, getBoxProps } from './Box.js'
import type { DefaultTokens, Tokens } from './tokens.js'

export type ImageProps<tokens extends Tokens = DefaultTokens> = {
  /** Sets the border radius of the image. */
  borderRadius?: BoxProps<tokens>['borderRadius']
  /** Sets the border bottom left radius of the image. */
  borderBottomLeftRadius?: BoxProps<tokens>['borderBottomLeftRadius']
  /** Sets the border bottom right radius of the image. */
  borderBottomRightRadius?: BoxProps<tokens>['borderBottomRightRadius']
  /** Sets the border top left radius of the image. */
  borderTopLeftRadius?: BoxProps<tokens>['borderTopLeftRadius']
  /** Sets the border top right radius of the image. */
  borderTopRightRadius?: BoxProps<tokens>['borderTopRightRadius']
  /** Sets the height of the image. */
  height?: BoxProps<tokens>['height']
  /** Sets the height of the image. */
  objectFit?: BoxProps<tokens>['objectFit']
  /** The URL of the image to display. */
  src: string
  /** Sets the width of the image. */
  width?: BoxProps<tokens>['width']
}

export function Image<tokens extends Tokens>(props: ImageProps<tokens>) {
  const { src, ...rest } = props
  const boxProps = getBoxProps({ ...rest, overflow: 'hidden' })
  return <img {...boxProps} src={src} />
}
