import { type Options, createFocusTrap } from 'focus-trap'
import { type RefObject } from 'hono/jsx'
import { useEffect } from 'hono/jsx/dom'

import { type Pretty } from '../../types/utils.js'

type UseFocusTrapParameters = Pretty<
  {
    active: boolean
    ref: RefObject<HTMLElement | null>
  } & Options
>

export function useFocusTrap(props: UseFocusTrapParameters) {
  const { active, ref, ...options } = props

  useEffect(() => {
    if (!ref.current) return

    const focusTrap = createFocusTrap(ref.current, options)
    if (active) focusTrap.activate()
    return () => focusTrap.deactivate()
  }, [active])
}
