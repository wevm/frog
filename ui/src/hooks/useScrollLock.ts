// based on https://usehooks-ts.com/react-hook/use-scroll-lock
import { useEffect, useRef, useState } from 'react'

type UseScrollLockParameters = {
  autoLock?: boolean | undefined
  lockTarget?: HTMLElement | string | undefined
  widthReflow?: boolean | undefined
}

type UseScrollLockReturnType = {
  isLocked: boolean
  lock: () => void
  unlock: () => void
}

type OriginalStyle = {
  overflow: CSSStyleDeclaration['overflow']
  paddingRight: CSSStyleDeclaration['paddingRight']
}

export function useScrollLock(
  parameters: UseScrollLockParameters = {},
): UseScrollLockReturnType {
  const { autoLock = true, lockTarget, widthReflow = true } = parameters
  const [isLocked, setIsLocked] = useState(false)
  const target = useRef<HTMLElement | null>(null)
  const originalStyle = useRef<OriginalStyle | null>(null)

  const lock = () => {
    if (target.current) {
      const { overflow, paddingRight } = target.current.style

      // Save the original styles
      originalStyle.current = { overflow, paddingRight }

      // Prevent width reflow
      if (widthReflow) {
        // Use window inner width if body is the target as global scrollbar isn't part of the document
        const offsetWidth =
          target.current === document.body
            ? window.innerWidth
            : target.current.offsetWidth
        // Get current computed padding right in pixels
        const currentPaddingRight =
          parseInt(window.getComputedStyle(target.current).paddingRight, 10) ||
          0

        const scrollbarWidth = offsetWidth - target.current.scrollWidth
        target.current.style.paddingRight = `${
          scrollbarWidth + currentPaddingRight
        }px`
      }

      // Lock the scroll
      target.current.style.overflow = 'hidden'

      setIsLocked(true)
    }
  }

  const unlock = () => {
    if (target.current && originalStyle.current) {
      target.current.style.overflow = originalStyle.current.overflow

      // Only reset padding right if we changed it
      if (widthReflow)
        target.current.style.paddingRight = originalStyle.current.paddingRight
    }

    setIsLocked(false)
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (lockTarget) {
      target.current =
        typeof lockTarget === 'string'
          ? document.querySelector(lockTarget)
          : lockTarget
    }

    if (!target.current) target.current = document.body
    if (autoLock) lock()

    return () => {
      unlock()
    }
  }, [autoLock, lockTarget, widthReflow])

  return { isLocked, lock, unlock }
}
