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
