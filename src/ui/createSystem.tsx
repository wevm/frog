import type { Assign } from '../types/utils.js'
import { Box } from './Box.js'
import { Column, Columns } from './Columns.js'
import { Heading } from './Heading.js'
import { HStack } from './HStack.js'
import { Icon } from './Icon.js'
import { Image } from './Image.js'
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
  >(Component: component) {
    return ((props: Parameters<component>[0]) => (
      <Component __context={{ tokens: mergedTokens }} {...(props as any)} />
    )) as component
  }

  return {
    Box: createComponent<typeof Box<MergedTokens>>(Box),
    Columns: createComponent<typeof Columns<MergedTokens>>(Columns),
    Column: createComponent<typeof Column<MergedTokens>>(Column),
    Heading: createComponent<typeof Heading<MergedTokens>>(Heading),
    HStack: createComponent<typeof HStack<MergedTokens>>(HStack),
    Icon: createComponent<typeof Icon<MergedTokens>>(Icon),
    Image: createComponent<typeof Image<MergedTokens>>(Image),
    Rows: createComponent<typeof Rows<MergedTokens>>(Rows),
    Row: createComponent<typeof Row<MergedTokens>>(Row),
    Spacer: createComponent<typeof Spacer<MergedTokens>>(Spacer),
    Text: createComponent<typeof Text<MergedTokens>>(Text),
    VStack: createComponent<typeof VStack<MergedTokens>>(VStack),
    tokens: mergedTokens,
  }
}
