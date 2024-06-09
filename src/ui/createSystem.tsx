import type { JSX } from 'hono/jsx/jsx-runtime'
import type { Assign } from '../types/utils.js'
import { Box } from './Box.js'
import { Column, Columns } from './Columns.js'
import { Divider } from './Divider.js'
import { HStack } from './HStack.js'
import { Heading } from './Heading.js'
import { Icon, type IconProps } from './Icon.js'
import { Image } from './Image.js'
import { Row, Rows } from './Rows.js'
import { Spacer } from './Spacer.js'
import { Text } from './Text.js'
import { VStack } from './VStack.js'
import { type DefaultVars, type Vars, defaultVars } from './vars.js'

/**
 * Creates a UI System with optional variables.
 *
 * @example
 * ```tsx
 * import { createSystem } from 'frog/ui'
 *
 * const { Box, Columns, Text } = createSystem()
 * ```
 *
 * @example
 * ```tsx
 * import { colors, createSystem } from 'frog/ui'
 *
 * const { Box, HStack, Text } = createSystem({
 *   colors: colors.light,
 *   fonts: [...]
 * })
 * ```
 */
export function createSystem<vars extends Vars = DefaultVars>(
  vars?: vars | undefined,
) {
  type MergedVars = Assign<DefaultVars, vars>

  const mergedVars = {
    ...defaultVars,
    ...vars,
  } as MergedVars

  function createComponent<
    const component extends (...args: any[]) => JSX.Element,
  >(Component: component): component {
    return ((props: Parameters<component>[0]) => (
      <Component __context={{ vars: mergedVars }} {...(props as any)} />
    )) as component
  }

  return {
    /**
     * The fundamental primitive component that includes style
     * properties (such as: `backgroundColor`, `border`,
     * `padding`, and more), and corresponding vars as values.
     *
     * By default, it renders a `div` element.
     *
     * @example
     * ```tsx
     * <Box backgroundColor="red" padding="16" />
     *   Hello, world!
     * </Box>
     * ```
     *
     * @see https://frog.fm/ui/Box
     */
    Box: createComponent<typeof Box<MergedVars>>(Box),
    /**
     * Renders children horizontally, with consistent spacing (if specified)
     * between them. Columns can also have a specific `width` value.
     *
     * @example
     * ```tsx
     * <Columns gap="8" grow>
     *   <Column backgroundColor="red" height="100%" />
     *   <Column backgroundColor="red" height="100%" />
     *   <Column backgroundColor="red" height="100%" />
     *   <Column backgroundColor="red" height="100%" />
     * </Columns>
     * ```
     *
     * @example
     * ```tsx
     * <Columns gap="8" grow>
     *   <Column backgroundColor="red" height="100%" width="1/3" />
     *   <Column backgroundColor="red" height="100%" width="2/3" />
     * </Columns>
     * ```
     *
     * @see https://frog.fm/ui/Columns
     */
    Columns: createComponent<typeof Columns<MergedVars>>(Columns),
    /**
     * The child component of `Columns`.
     *
     * @see https://frog.fm/ui/Columns
     */
    Column: createComponent<typeof Column<MergedVars>>(Column),
    /**
     * Renders a visual element that can be used to separate other content.
     *
     * When contained in a stack, the divider extends across the minor axis of the stack, or horizontally when not in a stack.
     *
     * @example
     *
     * <HStack gap="8">
     *   <Box backgroundColor="red" height="100%" />
     *   <Divider />
     *   <Box backgroundColor="red" height="100%" />
     * </HStack>
     *
     * @see https://frog.fm/ui/Divider
     */
    Divider: createComponent<typeof Divider<MergedVars>>(Divider),
    /**
     * Renders a heading element.
     *
     * @example
     * <Heading>Hello world</Heading>
     *
     * @see https://frog.fm/ui/Heading
     */
    Heading: createComponent<typeof Heading<MergedVars>>(Heading),
    /**
     * Arranges child nodes horizontally, wrapping to multiple lines if needed,
     * with equal spacing between items.
     *
     * @example
     * <HStack gap="8">
     *   <Box backgroundColor="red" height="100%" />
     *   <Box backgroundColor="red" height="100%" />
     *   <Box backgroundColor="red" height="100%" />
     *   <Box backgroundColor="red" height="100%" />
     * </HStack>
     *
     * @see https://frog.fm/ui/HStack
     */
    HStack: createComponent<typeof HStack<MergedVars>>(HStack),
    /**
     * Renders a icon element.
     *
     * @example
     * <Icon color="green800" name="bolt" />
     *
     * @see https://frog.fm/ui/Icon
     */
    Icon: <
      vars extends MergedVars,
      collection extends Vars['icons'] = MergedVars['icons'],
    >(
      props: IconProps<vars, collection>,
    ) => <Icon __context={{ vars: mergedVars }} {...props} />,
    /**
     * Renders a image element.
     *
     * @example
     * <Image
     *   objectFit="contain"
     *   src="/frog.png"
     *   height="100%"
     *   width="100%"
     * />
     *
     * @see https://frog.fm/ui/Image
     */
    Image: createComponent<typeof Image<MergedVars>>(Image),
    /**
     * Renders children vertically in equal-height rows by default,
     * with consistent spacing between them.
     *
     * @example
     * <Rows gap="8">
     *   <Row backgroundColor="red" width="100%" />
     *   <Row backgroundColor="red" width="100%" />
     *   <Row backgroundColor="red" width="100%" />
     *   <Row backgroundColor="red" width="100%" />
     * </Rows>
     *
     * @example
     * <Rows gap="8">
     *   <Row backgroundColor="red" width="100%" height="1/3" />
     *   <Row backgroundColor="red" width="100%" height="2/3" />
     * </Rows>
     *
     * @see https://frog.fm/ui/Rows
     */
    Rows: createComponent<typeof Rows<MergedVars>>(Rows),
    /**
     * The child component of `Rows`.
     *
     * @see https://frog.fm/ui/Rows
     */
    Row: createComponent<typeof Row<MergedVars>>(Row),
    /**
     * Adds spacing between nodes. If no size is specified,
     * it will span between the nodes.
     *
     * @example
     * <Spacer size="16" />
     *
     * @see https://frog.fm/ui/Spacer
     */
    Spacer: createComponent<typeof Spacer<MergedVars>>(Spacer),
    /**
     * Renders a text element.
     *
     * @example
     * <Text>Hello world</Text>
     *
     * @see https://frog.fm/ui/Text
     */
    Text: createComponent<typeof Text<MergedVars>>(Text),
    /**
     * Arranges children vertically with equal spacing between them.
     *
     * @example
     * <VStack gap="8" grow>
     *  <Box backgroundColor="red" width="100%" />
     *  <Box backgroundColor="red" width="100%" />
     *  <Box backgroundColor="red" width="100%" />
     *  <Box backgroundColor="red" width="100%" />
     * </VStack>
     *
     * @see https://frog.fm/ui/VStack
     */
    VStack: createComponent<typeof VStack<MergedVars>>(VStack),
    /**
     * The vars object that includes all the UI vars to be used
     * on the primitive components.
     */
    vars: mergedVars,
  }
}
