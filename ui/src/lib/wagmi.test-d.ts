import { expectTypeOf, test } from 'vitest'

import type { ChainIdEip155 } from '../types/frog'
import type { config } from './wagmi'

type ChainId = (typeof config.chains)[number]['id']

test('chains equal', () => {
  expectTypeOf<ChainId>().toEqualTypeOf<ChainIdEip155>()
})
