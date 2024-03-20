import { expectTypeOf, test } from 'vitest'

import type { ChainIdEip155 } from '../../../src/types/transaction'
import { config } from './wagmi'

type ChainId = (typeof config.chains)[number]['id']

test('chains equal', () => {
  expectTypeOf<ChainId>().toEqualTypeOf<ChainIdEip155>()
})
