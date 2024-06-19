import { type Options, createFocusTrap } from 'focus-trap'
import { type RefObject, useEffect } from 'react'

import type { Pretty } from '../types/utils'

type UseFocusTrapParameters = Pretty<
  {
    active: boolean
    ref: RefObject<HTMLElement | null>
  } & Options
>

export function useFocusTrap(props: UseFocusTrapParameters) {
  const { active, ref, ...options } = props

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (!ref.current) return

    const focusTrap = createFocusTrap(ref.current, options)
    if (active) focusTrap.activate()
    return () => {
      focusTrap.deactivate()
    }
  }, [active])
}
