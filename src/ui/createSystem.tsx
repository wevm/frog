import type { Assign } from '../types/utils.js'
import { Box } from './Box.js'
import { Column, Columns } from './Columns.js'
import { HStack } from './HStack.js'
import { Heading } from './Heading.js'
import { Row, Rows } from './Rows.js'
import { Spacer } from './Spacer.js'
import { Text } from './Text.js'
import { VStack } from './VStack.js'
import { type DefaultTokens, type Tokens, defaultTokens } from './tokens.js'

export function createSystem<tokens extends Tokens = DefaultTokens>(
  tokens?: tokens | undefined,
) {
  const mergedTokens = {
    ...defaultTokens,
    ...tokens,
  }

  type MergedTokens = Assign<DefaultTokens, tokens>

  function createComponent<
    const component extends (...args: any[]) => JSX.Element,
  >(Component: component): component {
    return ((props: Parameters<component>[0]) => (
      <Component __context={{ tokens: mergedTokens }} {...(props as any)} />
    )) as component
  }

  return {
    /**
     * The fundamental primitive component that includes style
     * properties (such as: `backgroundColor`, `border`,
     * `padding`, and more), and corresponding tokens as values.
     *
     * By default, it renders a `div` element.
     *
     * @example
     * ```tsx
     * <Box backgroundColor="red" padding="16" />
     *   Hello, world!
     * </Box>
     * ```
     */
    Box: createComponent<typeof Box<MergedTokens>>(Box),
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
     */
    Columns: createComponent<typeof Columns<MergedTokens>>(Columns),
    /**
     * The child component of `Columns`.
     */
    Column: createComponent<typeof Column<MergedTokens>>(Column),
    /**
     * Renders a heading element.
     *
     * @example
     * <Heading>Hello world</Heading>
     */
    Heading: createComponent<typeof Heading<MergedTokens>>(Heading),
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
     */
    HStack: createComponent<typeof HStack<MergedTokens>>(HStack),
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
     */
    Rows: createComponent<typeof Rows<MergedTokens>>(Rows),
    /**
     * The child component of `Rows`.
     */
    Row: createComponent<typeof Row<MergedTokens>>(Row),
    /**
     * Adds spacing between nodes. If no size is specified,
     * it will span between the nodes.
     *
     * @example
     * <Spacer size="16" />
     */
    Spacer: createComponent<typeof Spacer<MergedTokens>>(Spacer),
    /**
     * Renders a text element.
     *
     * @example
     * <Text>Hello world</Text>
     */
    Text: createComponent<typeof Text<MergedTokens>>(Text),
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
     */
    VStack: createComponent<typeof VStack<MergedTokens>>(VStack),
    /**
     * The tokens object that includes all the UI tokens to be used
     * on the primitive components.
     */
    tokens: mergedTokens,
  }
}
