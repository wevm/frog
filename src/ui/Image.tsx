import { Box, type BoxProps } from './Box.js'
import type { DefaultVars, Vars } from './vars.js'

export type ImageProps<vars extends Vars = DefaultVars> = {
  /** Sets the border radius of the image. */
  borderRadius?: BoxProps<vars>['borderRadius']
  /** Sets the border bottom left radius of the image. */
  borderBottomLeftRadius?: BoxProps<vars>['borderBottomLeftRadius']
  /** Sets the border bottom right radius of the image. */
  borderBottomRightRadius?: BoxProps<vars>['borderBottomRightRadius']
  /** Sets the border top left radius of the image. */
  borderTopLeftRadius?: BoxProps<vars>['borderTopLeftRadius']
  /** Sets the border top right radius of the image. */
  borderTopRightRadius?: BoxProps<vars>['borderTopRightRadius']
  /** Sets the height of the image. */
  height?: BoxProps<vars>['height']
  /** Sets the height of the image. */
  objectFit?: BoxProps<vars>['objectFit']
  /** The URL of the image to display. */
  src: string
  /** Sets the width of the image. */
  width?: BoxProps<vars>['width']
}

export function Image<vars extends Vars>(props: ImageProps<vars>) {
  const {
    borderRadius,
    borderBottomLeftRadius,
    borderBottomRightRadius,
    borderTopLeftRadius,
    borderTopRightRadius,
    height,
    objectFit,
    src,
    width,
  } = props
  return (
    <Box
      borderRadius={borderRadius}
      borderBottomLeftRadius={borderBottomLeftRadius}
      borderBottomRightRadius={borderBottomRightRadius}
      borderTopLeftRadius={borderTopLeftRadius}
      borderTopRightRadius={borderTopRightRadius}
      height={height}
      objectFit={objectFit}
      // @ts-ignore - private
      src={src}
      width={width}
    />
  )
}
