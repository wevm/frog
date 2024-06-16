import { expectTypeOf, test } from 'vitest'

import { createSystem } from './createSystem.js'
import { heroicons, type lucide } from './icons/index.js'

test('defaults', () => {
  const { Icon } = createSystem()
  type IconProps = Parameters<typeof Icon>[0]
  expectTypeOf<IconProps['collection']>().toEqualTypeOf<
    Record<string, string> | undefined
  >()
  expectTypeOf<IconProps['name']>().toEqualTypeOf<keyof typeof lucide>()
})

test('custom system collection', () => {
  const { Icon } = createSystem({ icons: heroicons })
  type IconProps = Parameters<typeof Icon>[0]
  expectTypeOf<IconProps['collection']>().toEqualTypeOf<
    Record<string, string> | undefined
  >()
  expectTypeOf<IconProps['name']>().toEqualTypeOf<keyof typeof heroicons>()
})

test('custom system collection', () => {
  const { Icon, vars } = createSystem()
  type IconProps = Parameters<typeof Icon<typeof vars, typeof heroicons>>[0]
  expectTypeOf<IconProps['collection']>().toEqualTypeOf<
    typeof heroicons | Record<string, string> | undefined
  >()
  expectTypeOf<IconProps['name']>().toEqualTypeOf<keyof typeof heroicons>()
})
