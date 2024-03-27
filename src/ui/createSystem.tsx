import type { Assign } from '../types/utils.js'
import { Box } from './Box.js'
import { Column, Columns } from './Columns.js'
import { Cover } from './Cover.js'
import { HStack } from './HStack.js'
import { Spacer } from './Spacer.js'
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
    Cover: createComponent<typeof Cover<MergedTokens>>(Cover),
    HStack: createComponent<typeof HStack<MergedTokens>>(HStack),
    Spacer: createComponent<typeof Spacer<MergedTokens>>(Spacer),
    VStack: createComponent<typeof VStack<MergedTokens>>(VStack),
    tokens: mergedTokens,
  }
}
