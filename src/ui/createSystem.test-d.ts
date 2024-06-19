import { expectTypeOf, test } from 'vitest'

import { createSystem } from './createSystem.js'
import { heroicons, type lucide } from './icons/index.js'

test('defaults', () => {
  const { vars } = createSystem()
  expectTypeOf(vars.icons).toEqualTypeOf<typeof lucide>()
})

test('custom', () => {
  const { vars } = createSystem({ icons: heroicons })
  expectTypeOf(vars.icons).toEqualTypeOf<typeof heroicons>()
})
