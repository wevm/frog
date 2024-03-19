import { IconProps } from '@radix-ui/react-icons/dist/types'
import React from 'react'

export const WarpIcon = React.forwardRef<
  SVGSVGElement,
  IconProps & { className?: string | undefined }
>((props, forwardedRef) => {
  const { color = 'currentColor', ...rest } = props
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: <explanation>
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
      ref={forwardedRef}
    >
      <path
        d="M7.85367 1.48956C7.65841 1.29429 7.34182 1.29429 7.14656 1.48956L1.48971 7.14641C1.29445 7.34167 1.29445 7.65825 1.48971 7.85352L7.14656 13.5104C7.34182 13.7056 7.65841 13.7056 7.85367 13.5104L13.5105 7.85352C13.7058 7.65825 13.7058 7.34167 13.5105 7.14641L7.85367 1.48956ZM7.5 2.55033L2.55037 7.49996L7.5 12.4496V2.55033Z"
        fill={color}
        fill-rule="evenodd"
        clip-rule="evenodd"
      />
    </svg>
  )
})

export const FarcasterIcon = React.forwardRef<
  SVGSVGElement,
  IconProps & { className?: string | undefined }
>((props, forwardedRef) => {
  const { color = 'currentColor', ...rest } = props
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: <explanation>
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 1024 1024"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
      ref={forwardedRef}
    >
      <path
        d="M308.786 227H715.928V308.429L817.714 308.429L797.357 389.857H777V715.571C788.247 715.571 797.357 724.681 797.357 735.928V756.286C808.604 756.286 817.714 765.396 817.714 776.643V797H614.143V776.643C614.143 765.396 623.253 756.286 634.5 756.286L634.5 735.928C634.5 724.681 643.61 715.571 654.857 715.571L654.857 550.97C654.795 472.322 591.019 408.586 512.357 408.586C433.672 408.586 369.883 472.359 369.857 551.038L369.857 715.571C381.104 715.571 390.214 724.681 390.214 735.928V756.286C401.462 756.286 410.571 765.396 410.571 776.643V797H207V776.643C207 765.396 216.11 756.286 227.357 756.286L227.357 735.928C227.357 724.681 236.467 715.571 247.714 715.571L247.714 389.857H227.357L207 308.429L308.786 308.429V227Z"
        fill={color}
      />
    </svg>
  )
})
