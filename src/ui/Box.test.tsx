import { expect, test } from 'vitest'

import { resolveUnitToken } from './Box.js'
import { defaultVars } from './vars.js'

test('resolveUnitToken', () => {
  const { units } = defaultVars

  const vheight = 630

  // 1.91:1
  {
    const vwidth = 1_200
    const vmax = Math.max(vwidth, vheight)
    const res = resolveUnitToken(units, 16, vmax)
    expect(res).toMatchInlineSnapshot(`"30.476190476190474px"`)
  }

  // 1:1
  {
    const vwidth = 630
    const vmax = Math.max(vwidth, vheight)
    const res = resolveUnitToken(units, 16, vmax)
    expect(res).toMatchInlineSnapshot(`"16px"`)
  }
})
