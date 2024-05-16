import { expectTypeOf, test } from 'vitest'

import { createSystem } from './createSystem.js'
import type { lucide } from './icons/index.js'
import { heroicons } from '../_lib/ui/icons/index.js'

test('defaults', () => {
  const { vars } = createSystem()
  expectTypeOf(vars.icons).toEqualTypeOf<typeof lucide>()
})

test('custom', () => {
  const { vars } = createSystem({ icons: heroicons })
  expectTypeOf(vars.icons).toEqualTypeOf<typeof heroicons>()
})
