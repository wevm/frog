import type { DeepAssign } from '../types/utils.js'
import { Box, type BoxProps } from './Box.js'
import { Cover, type CoverProps } from './Cover.js'
import { VStack, type VStackProps } from './VStack.js'
import { type DefaultTokens, type Tokens, defaultTokens } from './tokens.js'

export function createSystem<tokens extends Tokens = DefaultTokens>(
  tokens?: tokens | undefined,
) {
  const mergedTokens = {
    ...defaultTokens,
    colors: { ...defaultTokens.colors, ...tokens?.colors },
    ...tokens,
  }

  type MergedTokens = DeepAssign<DefaultTokens, tokens>

  function createComponent<props>(Component: (...args: any[]) => JSX.Element) {
    return (props: props) => (
      <Component __context={{ tokens: mergedTokens }} {...(props as any)} />
    )
  }

  return {
    Box: createComponent<BoxProps<MergedTokens>>(Box),
    Cover: createComponent<CoverProps<MergedTokens>>(Cover),
    VStack: createComponent<VStackProps<MergedTokens>>(VStack),
    tokens: mergedTokens,
  }
}
