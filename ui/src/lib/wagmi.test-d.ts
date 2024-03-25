import { expectTypeOf, test } from 'vitest'

import { ChainIdEip155 } from '../types/frog'
import { config } from './wagmi'

type ChainId = (typeof config.chains)[number]['id']

test('chains equal', () => {
  expectTypeOf<ChainId>().toEqualTypeOf<ChainIdEip155>()
})
